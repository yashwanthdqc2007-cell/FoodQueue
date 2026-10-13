import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateImpact,
  normalizeQuantityToKg,
} from "@/lib/rules/impact-calculator";
import {
  canTransitionPickupStatus,
  getAllowedNextStatuses,
  isRoleAuthorizedForTransition,
  validateProofFile,
  formatProofStoragePath,
  PickupStatus,
  AppRole,
} from "@/lib/rules/pickup-state-machine";

describe("Phase 8: Realtime Updates, Notifications & UX Polish Tests", () => {
  describe("1. Canonical Impact Conversion Consistency (0.4 kg/meal)", () => {
    it("strictly evaluates 0.4 kg per estimated meal as canonical standard", () => {
      const impact100 = calculateImpact(100, "kg");
      assert.equal(impact100.foodSavedQuantity, 100);
      assert.equal(impact100.estimatedMealsSaved, 250); // 100 / 0.4 = 250
      assert.equal(impact100.estimatedCo2eAvoided, 250); // 100 * 2.5
      assert.equal(impact100.estimatedValueSaved, 6000); // 100 * 60

      const impact10 = calculateImpact(10, "kg");
      assert.equal(impact10.foodSavedQuantity, 10);
      assert.equal(impact10.estimatedMealsSaved, 25); // 10 / 0.4 = 25
      assert.equal(impact10.estimatedCo2eAvoided, 25);
      assert.equal(impact10.estimatedValueSaved, 600);
    });

    it("returns exact 0 metrics for zero food quantity without manufactured numbers", () => {
      const zeroImpact = calculateImpact(0, "kg");
      assert.equal(zeroImpact.foodSavedQuantity, 0);
      assert.equal(zeroImpact.estimatedMealsSaved, 0);
      assert.equal(zeroImpact.estimatedCo2eAvoided, 0);
      assert.equal(zeroImpact.estimatedValueSaved, 0);
    });

    it("normalizes servings and grams to kilograms safely", () => {
      assert.equal(normalizeQuantityToKg(25, "servings"), 10); // 25 * 0.4 = 10 kg
      assert.equal(normalizeQuantityToKg(5000, "g"), 5); // 5000 / 1000 = 5 kg
      assert.equal(normalizeQuantityToKg(15, "liters"), 15); // 1:1 density
    });
  });

  describe("2. Pickup State Transitions & Role Authorization Matrix", () => {
    it("permits canonical transitions: requested -> scheduled, scheduled -> picked_up", () => {
      assert.equal(canTransitionPickupStatus("requested", "scheduled"), true);
      assert.equal(canTransitionPickupStatus("scheduled", "picked_up"), true);
    });

    it("permits direct collection: requested -> picked_up", () => {
      assert.equal(canTransitionPickupStatus("requested", "picked_up"), true);
    });

    it("permits cancellations from non-terminal states", () => {
      assert.equal(canTransitionPickupStatus("requested", "cancelled"), true);
      assert.equal(canTransitionPickupStatus("scheduled", "cancelled"), true);
    });

    it("strictly blocks transitions from terminal 'picked_up' status", () => {
      assert.equal(canTransitionPickupStatus("picked_up", "requested"), false);
      assert.equal(canTransitionPickupStatus("picked_up", "scheduled"), false);
      assert.equal(canTransitionPickupStatus("picked_up", "cancelled"), false);
      assert.deepEqual(getAllowedNextStatuses("picked_up"), []);
    });

    it("strictly blocks transitions from terminal 'cancelled' status", () => {
      assert.equal(canTransitionPickupStatus("cancelled", "requested"), false);
      assert.equal(canTransitionPickupStatus("cancelled", "scheduled"), false);
      assert.equal(canTransitionPickupStatus("cancelled", "picked_up"), false);
      assert.deepEqual(getAllowedNextStatuses("cancelled"), []);
    });

    it("enforces strict role-based transition authorization", () => {
      // Kitchen can schedule and cancel
      assert.equal(isRoleAuthorizedForTransition("kitchen", "requested", "scheduled"), true);
      assert.equal(isRoleAuthorizedForTransition("kitchen", "scheduled", "cancelled"), true);
      assert.equal(isRoleAuthorizedForTransition("kitchen", "scheduled", "picked_up"), false); // Kitchen cannot complete

      // Receiver can complete collection and cancel
      assert.equal(isRoleAuthorizedForTransition("receiver", "scheduled", "picked_up"), true);
      assert.equal(isRoleAuthorizedForTransition("receiver", "requested", "picked_up"), true);
      assert.equal(isRoleAuthorizedForTransition("receiver", "requested", "scheduled"), false); // Receiver cannot schedule

      // Admin has full authorized access
      assert.equal(isRoleAuthorizedForTransition("admin", "requested", "scheduled"), true);
      assert.equal(isRoleAuthorizedForTransition("admin", "scheduled", "picked_up"), true);
      assert.equal(isRoleAuthorizedForTransition("admin", "requested", "cancelled"), true);
    });
  });

  describe("3. In-App Notification Deduplication & Formatting", () => {
    function createToastDeduplicator(cooldownMs: number = 2000) {
      let lastToast: { message: string; timestamp: number } | null = null;
      return function shouldShowToast(message: string, now: number): boolean {
        if (lastToast && lastToast.message === message && now - lastToast.timestamp < cooldownMs) {
          return false; // deduplicated
        }
        lastToast = { message, timestamp: now };
        return true;
      };
    }

    it("suppresses identical rapid notification bursts within cooldown window", () => {
      const shouldShow = createToastDeduplicator(2000);
      const t0 = 10000;

      assert.equal(shouldShow("Pickup scheduled successfully", t0), true);
      // Rapid duplicate event 100ms later
      assert.equal(shouldShow("Pickup scheduled successfully", t0 + 100), false);
      // Another rapid duplicate 500ms later
      assert.equal(shouldShow("Pickup scheduled successfully", t0 + 500), false);

      // Different message is allowed
      assert.equal(shouldShow("New surplus opportunity available", t0 + 600), true);

      // Same message after cooldown (2500ms later) is allowed
      assert.equal(shouldShow("Pickup scheduled successfully", t0 + 3100), true);
    });
  });

  describe("4. Realtime Subscription & Event Debounce Mechanics", () => {
    it("coalesces multi-event burst into single authoritative refresh execution", async () => {
      let executionCount = 0;
      let timer: NodeJS.Timeout | null = null;

      function triggerEvent() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          executionCount++;
        }, 50);
      }

      // Simulate 5 rapid realtime postgres events firing within 30ms
      triggerEvent();
      triggerEvent();
      triggerEvent();
      triggerEvent();
      triggerEvent();

      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.equal(executionCount, 1);
    });

    it("validates proof upload constraints and storage path formatting", () => {
      assert.equal(validateProofFile("image/jpeg", 2 * 1024 * 1024).valid, true);
      assert.equal(validateProofFile("image/png", 1024 * 1024).valid, true);
      assert.equal(validateProofFile("image/webp", 500 * 1024).valid, true);
      assert.equal(validateProofFile("application/pdf", 1024).valid, false);
      assert.equal(validateProofFile("image/jpeg", 6 * 1024 * 1024).valid, false); // > 5MB

      const formattedPath = formatProofStoragePath(
        "u0000000-0000-0000-0000-000000000001",
        "p0000000-0000-0000-0000-000000000001",
        "delivery proof #1.jpg"
      );
      assert.equal(
        formattedPath,
        "pickup-proofs/u0000000-0000-0000-0000-000000000001/p0000000-0000-0000-0000-000000000001/delivery_proof__1.jpg"
      );
    });
  });
});
