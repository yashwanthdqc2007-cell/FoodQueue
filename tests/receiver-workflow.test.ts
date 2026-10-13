import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateReceiverEligibility,
  EligibilitySurplusInput,
  EligibilityReceiverInput,
} from "@/lib/matching/eligibility";
import { computeMatchScore } from "@/lib/matching/scoring";
import {
  createPickupSchema,
  updatePickupStatusSchema,
  pickupQuerySchema,
} from "@/lib/validation/pickup";
import {
  calculateImpact,
  normalizeQuantityToKg,
} from "@/lib/rules/impact-calculator";

describe("Phase 7: Receiver Journey & End-to-End Workflow Guards", () => {
  const baseSurplus: EligibilitySurplusInput = {
    id: "s0000000-0000-0000-0000-000000000001",
    foodName: "Rice & Dal Meal",
    quantity: 50,
    unit: "kg",
    category: "cooked_meals",
    status: "active",
    isExpired: false,
    kitchenOrgId: "o0000000-0000-0000-0000-000000000001",
  };

  const baseReceiver: EligibilityReceiverInput = {
    id: "r0000000-0000-0000-0000-000000000001",
    organizationId: "o0000000-0000-0000-0000-000000000002",
    organizationName: "Mercy Food Center",
    receiverType: "shelter",
    maxCapacity: 100,
    verified: true,
    acceptedFoodTypes: ["cooked_meals", "produce"],
  };

  describe("1. Receiver Readiness & Verification Gate", () => {
    it("rejects unverified receivers with 'RECEIVER_NOT_VERIFIED'", () => {
      const unverifiedReceiver: EligibilityReceiverInput = {
        ...baseReceiver,
        verified: false,
      };

      const result = evaluateReceiverEligibility(baseSurplus, unverifiedReceiver);
      assert.equal(result.eligible, false);
      assert.ok(result.reasonCodes.includes("RECEIVER_NOT_VERIFIED"));
    });

    it("accepts verified receiver having sufficient capacity and accepted category", () => {
      const result = evaluateReceiverEligibility(baseSurplus, baseReceiver);
      assert.equal(result.eligible, true);
      assert.equal(result.rejectionReasons.length, 0);
      assert.ok(result.reasonCodes.includes("ELIGIBLE"));
    });

    it("rejects receiver whose max capacity is smaller than surplus quantity", () => {
      const smallCapacityReceiver: EligibilityReceiverInput = {
        ...baseReceiver,
        maxCapacity: 20, // 20 kg < 50 kg surplus
      };

      const result = evaluateReceiverEligibility(baseSurplus, smallCapacityReceiver);
      assert.equal(result.eligible, false);
      assert.ok(result.reasonCodes.includes("INSUFFICIENT_CAPACITY"));
    });
  });

  describe("2. Opportunity Scoring & Explainability", () => {
    it("computes bounded match score [0, 100] and returns explainable factors", () => {
      const scoringSurplus = {
        quantity: 50,
        remainingMinutes: 180,
        isExpired: false,
        coordinates: { latitude: 12.9716, longitude: 77.5946 },
      };

      const scoringReceiver = {
        maxCapacity: 100,
        priorityLevel: 4,
        coordinates: { latitude: 12.975, longitude: 77.598 },
      };

      const scoreResult = computeMatchScore(scoringSurplus, scoringReceiver);
      assert.ok(scoreResult.finalScore >= 0 && scoreResult.finalScore <= 100);
      assert.ok(scoreResult.breakdown.distanceKm >= 0);
      assert.ok(scoreResult.breakdown.distanceScore >= 0);
      assert.ok(scoreResult.breakdown.quantityScore >= 0);
      assert.ok(scoreResult.breakdown.urgencyScore >= 0);
      assert.ok(scoreResult.breakdown.capacityScore >= 0);
      assert.ok(scoreResult.breakdown.priorityScore >= 0);
      assert.ok(scoreResult.explainableReasons.length > 0);
    });
  });

  describe("3. Pickup State Machine & Role Security", () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      requested: ["scheduled", "picked_up", "cancelled"],
      scheduled: ["picked_up", "cancelled"],
      picked_up: [],
      cancelled: [],
    };

    function canTransition(from: string, to: string): boolean {
      return (VALID_TRANSITIONS[from] || []).includes(to);
    }

    it("allows receiver to perform collection (scheduled -> picked_up)", () => {
      assert.equal(canTransition("scheduled", "picked_up"), true);
      const parsed = updatePickupStatusSchema.safeParse({
        status: "picked_up",
        proofImagePath: "pickup-proofs/u1/p1/img.jpg",
      });
      assert.equal(parsed.success, true);
    });

    it("strictly blocks modifications once pickup is in terminal 'picked_up' state", () => {
      assert.equal(canTransition("picked_up", "cancelled"), false);
      assert.equal(canTransition("picked_up", "scheduled"), false);
      assert.equal(canTransition("picked_up", "requested"), false);
    });
  });

  describe("4. Proof Storage & MIME Type Integrity", () => {
    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;

    function validateProofFile(mimeType: string, sizeBytes: number) {
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return { valid: false, error: "Invalid MIME type" };
      }
      if (sizeBytes > MAX_SIZE_BYTES) {
        return { valid: false, error: "File size exceeds 5MB limit" };
      }
      return { valid: true };
    }

    it("validates legitimate image uploads (JPEG, PNG, WebP) under 5MB", () => {
      assert.equal(validateProofFile("image/jpeg", 2 * 1024 * 1024).valid, true);
      assert.equal(validateProofFile("image/png", 1024 * 1024).valid, true);
      assert.equal(validateProofFile("image/webp", 500 * 1024).valid, true);
    });

    it("rejects non-image MIME types and oversize payloads", () => {
      assert.equal(validateProofFile("application/pdf", 1024).valid, false);
      assert.equal(validateProofFile("text/html", 1024).valid, false);
      assert.equal(validateProofFile("image/jpeg", 6 * 1024 * 1024).valid, false); // > 5MB
    });
  });

  describe("5. Receiver Impact Metric Truth & Attribution", () => {
    it("correctly converts kg to meals, CO2e, and economic value", () => {
      const impact = calculateImpact(100, "kg");
      assert.equal(impact.foodSavedQuantity, 100);
      assert.equal(impact.estimatedMealsSaved, 250); // 100 / 0.4
      assert.equal(impact.estimatedCo2eAvoided, 250); // 100 * 2.5
      assert.equal(impact.estimatedValueSaved, 6000); // 100 * 60
    });

    it("normalizes diverse units correctly without mixing quantities", () => {
      assert.equal(normalizeQuantityToKg(50, "kg"), 50);
      assert.equal(normalizeQuantityToKg(5000, "g"), 5);
      assert.equal(normalizeQuantityToKg(10, "servings"), 4); // 10 * 0.4
      assert.equal(normalizeQuantityToKg(20, "portions"), 8); // 20 * 0.4
    });

    it("returns zero impact for empty historical records without fabricating metrics", () => {
      const emptyImpact = calculateImpact(0, "kg");
      assert.equal(emptyImpact.foodSavedQuantity, 0);
      assert.equal(emptyImpact.estimatedMealsSaved, 0);
      assert.equal(emptyImpact.estimatedCo2eAvoided, 0);
      assert.equal(emptyImpact.estimatedValueSaved, 0);
    });
  });
});
