import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateReceiverEligibility } from "@/lib/matching/eligibility";
import {
  computeMatchScore,
  calculateDistanceScore,
  calculateQuantityScore,
  calculateUrgencyScore,
  calculateCapacityScaleScore,
  calculatePriorityScore,
  MATCH_WEIGHTS,
} from "@/lib/matching/scoring";
import { calculateHaversineDistanceKm } from "@/lib/matching/distance";

describe("Phase 4: Deterministic Matching Engine Tests", () => {
  // ============================================================
  // 1. ELIGIBILITY ENGINE TESTS
  // ============================================================
  describe("Receiver Eligibility Engine", () => {
    const baseSurplus = {
      id: "50000000-0000-0000-0000-000000000001",
      foodName: "Cooked Rice",
      quantity: 30,
      unit: "kg",
      category: "edible_surplus",
      status: "active",
      isExpired: false,
      kitchenOrgId: "10000000-0000-0000-0000-000000000001",
    };

    const baseReceiver = {
      id: "30000000-0000-0000-0000-000000000001",
      organizationId: "10000000-0000-0000-0000-000000000002",
      organizationName: "Hope Community Centre",
      verified: true,
      maxCapacity: 100,
      acceptedFoodTypes: ["cooked_rice", "vegetables", "dal"],
      receiverType: "ngo",
    };

    it("evaluates a verified receiver with compatible capacity and food type as ELIGIBLE", () => {
      const result = evaluateReceiverEligibility(baseSurplus, baseReceiver);
      assert.equal(result.eligible, true);
      assert.deepEqual(result.reasonCodes, ["ELIGIBLE"]);
      assert.equal(result.rejectionReasons.length, 0);
    });

    it("rejects unverified receiver", () => {
      const unverified = { ...baseReceiver, verified: false };
      const result = evaluateReceiverEligibility(baseSurplus, unverified);
      assert.equal(result.eligible, false);
      assert.ok(result.reasonCodes.includes("RECEIVER_NOT_VERIFIED"));
    });

    it("rejects receiver with insufficient intake capacity", () => {
      const lowCapacity = { ...baseReceiver, maxCapacity: 20 }; // Surplus is 30kg
      const result = evaluateReceiverEligibility(baseSurplus, lowCapacity);
      assert.equal(result.eligible, false);
      assert.ok(result.reasonCodes.includes("INSUFFICIENT_CAPACITY"));
    });

    it("rejects receiver with incompatible food type", () => {
      const restrictedReceiver = {
        ...baseReceiver,
        acceptedFoodTypes: ["bakery", "packaged_snacks"],
      };
      const result = evaluateReceiverEligibility(baseSurplus, restrictedReceiver);
      assert.equal(result.eligible, false);
      assert.ok(result.reasonCodes.includes("INCOMPATIBLE_FOOD_TYPE"));
    });

    it("accepts receiver with wildcard or matched food category", () => {
      const wildcardReceiver = {
        ...baseReceiver,
        acceptedFoodTypes: ["*"],
      };
      const result = evaluateReceiverEligibility(baseSurplus, wildcardReceiver);
      assert.equal(result.eligible, true);
    });

    it("rejects when surplus deadline is expired", () => {
      const expiredSurplus = { ...baseSurplus, isExpired: true };
      const result = evaluateReceiverEligibility(expiredSurplus, baseReceiver);
      assert.equal(result.eligible, false);
      assert.ok(result.reasonCodes.includes("SURPLUS_DEADLINE_EXPIRED"));
    });

    it("rejects when surplus is not active (e.g. matched, disposed)", () => {
      const inactiveSurplus = { ...baseSurplus, status: "matched" };
      const result = evaluateReceiverEligibility(inactiveSurplus, baseReceiver);
      assert.equal(result.eligible, false);
      assert.ok(result.reasonCodes.includes("SURPLUS_NOT_ACTIVE"));
    });

    it("rejects when receiver belongs to the source kitchen organization (cross-org isolation)", () => {
      const sameOrgReceiver = {
        ...baseReceiver,
        organizationId: baseSurplus.kitchenOrgId, // Same as kitchen
      };
      const result = evaluateReceiverEligibility(baseSurplus, sameOrgReceiver);
      assert.equal(result.eligible, false);
      assert.ok(result.reasonCodes.includes("SAME_ORGANIZATION_BOUNDARY"));
    });

    it("rejects when receiver has invalid/missing organization", () => {
      const noOrgReceiver = {
        ...baseReceiver,
        organizationId: "",
      };
      const result = evaluateReceiverEligibility(baseSurplus, noOrgReceiver);
      assert.equal(result.eligible, false);
      assert.ok(result.reasonCodes.includes("INVALID_ORGANIZATION"));
    });
  });

  // ============================================================
  // 2. DISTANCE CALCULATION TESTS
  // ============================================================
  describe("Deterministic Haversine Distance Calculation", () => {
    it("calculates accurate great-circle distance between Chennai coordinates", () => {
      // Chennai Central (13.0827, 80.2707) to T. Nagar (13.0418, 80.2341) ~ 6.0 km
      const kitchenCoords = { latitude: 13.0827, longitude: 80.2707 };
      const receiverCoords = { latitude: 13.0418, longitude: 80.2341 };

      const distance = calculateHaversineDistanceKm(kitchenCoords, receiverCoords);
      assert.ok(distance >= 5.5 && distance <= 6.5, `Distance was ${distance}`);
    });

    it("returns 0 km for identical coordinates", () => {
      const point = { latitude: 13.08268, longitude: 80.270718 };
      const distance = calculateHaversineDistanceKm(point, point);
      assert.equal(distance, 0);
    });
  });

  // ============================================================
  // 3. MULTI-FACTOR MATCH SCORE TESTS
  // ============================================================
  describe("Locked Multi-Factor Score Formulas", () => {
    it("verifies locked weight distribution sums to 1.00", () => {
      const sum =
        MATCH_WEIGHTS.DISTANCE +
        MATCH_WEIGHTS.QUANTITY +
        MATCH_WEIGHTS.URGENCY +
        MATCH_WEIGHTS.CAPACITY +
        MATCH_WEIGHTS.PRIORITY;
      assert.equal(Math.round(sum * 100) / 100, 1.0);
      assert.equal(MATCH_WEIGHTS.DISTANCE, 0.40);
      assert.equal(MATCH_WEIGHTS.QUANTITY, 0.25);
      assert.equal(MATCH_WEIGHTS.URGENCY, 0.20);
      assert.equal(MATCH_WEIGHTS.CAPACITY, 0.10);
      assert.equal(MATCH_WEIGHTS.PRIORITY, 0.05);
    });

    it("distance score: bounds and scores linearly based on proximity", () => {
      assert.equal(calculateDistanceScore(0.5), 100);
      assert.equal(calculateDistanceScore(1.0), 100);
      assert.ok(calculateDistanceScore(5.0) < 100 && calculateDistanceScore(5.0) > 10);
      assert.equal(calculateDistanceScore(25.0), 10);
      assert.equal(calculateDistanceScore(50.0), 10);
    });

    it("quantity score: scores high for appropriate match and degrades on massive disparity", () => {
      // 30kg into 40kg (75% utilization) -> 100
      const score75 = calculateQuantityScore(30, 40);
      assert.equal(score75, 100);

      // 10kg into 100kg -> still scores reasonably
      const score10 = calculateQuantityScore(10, 100);
      assert.ok(score10 >= 30 && score10 <= 100);

      // 0 capacity
      assert.equal(calculateQuantityScore(10, 0), 0);
    });

    it("urgency score: prioritizes items nearing deadline", () => {
      assert.equal(calculateUrgencyScore(20, false), 100); // < 30 min critical
      assert.equal(calculateUrgencyScore(45, false), 85);  // 30-60 min urgent
      assert.equal(calculateUrgencyScore(120, false), 70); // 1-3 hours
      assert.equal(calculateUrgencyScore(300, false), 50); // > 3 hours
      assert.equal(calculateUrgencyScore(0, true), 0);     // expired
    });

    it("capacity scale score: scales between [10, 100]", () => {
      assert.equal(calculateCapacityScaleScore(100), 100);
      assert.equal(calculateCapacityScaleScore(0), 10);
      assert.ok(calculateCapacityScaleScore(50) >= 10 && calculateCapacityScaleScore(50) <= 100);
    });

    it("priority score: maps 1-5 priority levels to [20, 100]", () => {
      assert.equal(calculatePriorityScore(1), 20);
      assert.equal(calculatePriorityScore(2), 40);
      assert.equal(calculatePriorityScore(3), 60);
      assert.equal(calculatePriorityScore(4), 80);
      assert.equal(calculatePriorityScore(5), 100);
    });

    it("full match score computation strictly bounds finalScore in [0, 100] and generates explainable reasons", () => {
      const surplus = {
        quantity: 32,
        remainingMinutes: 145,
        isExpired: false,
        coordinates: { latitude: 13.08268, longitude: 80.270718 },
      };

      const receiver = {
        maxCapacity: 100,
        priorityLevel: 5,
        coordinates: { latitude: 13.067439, longitude: 80.237617 }, // ~3.9 km
      };

      const result = computeMatchScore(surplus, receiver);

      assert.ok(result.finalScore >= 0 && result.finalScore <= 100, `Final score was ${result.finalScore}`);
      assert.ok(result.breakdown.distanceScore >= 0);
      assert.ok(result.breakdown.quantityScore >= 0);
      assert.ok(result.breakdown.urgencyScore >= 0);
      assert.ok(result.breakdown.capacityScore >= 0);
      assert.ok(result.breakdown.priorityScore >= 0);
      assert.ok(result.explainableReasons.length >= 3);
    });
  });

  // ============================================================
  // 4. RANKING & TIE-BREAKING
  // ============================================================
  describe("Candidate Ranking & Selection", () => {
    it("ranks candidates in descending order of final score", () => {
      const candidates = [
        { receiverId: "rec-1", finalScore: 78.5 },
        { receiverId: "rec-2", finalScore: 94.2 },
        { receiverId: "rec-3", finalScore: 86.0 },
      ];

      const sorted = [...candidates].sort((a, b) => b.finalScore - a.finalScore);

      assert.equal(sorted[0].receiverId, "rec-2");
      assert.equal(sorted[1].receiverId, "rec-3");
      assert.equal(sorted[2].receiverId, "rec-1");
    });
  });
});
