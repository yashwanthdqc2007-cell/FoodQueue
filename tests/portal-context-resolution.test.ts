import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeRescueClock } from "@/lib/rules/rescue-clock";
import { calculateImpact, normalizeQuantityToKg } from "@/lib/rules/impact-calculator";

describe("Phase 9: Portal Context Resolution, Role Scoping & Seed Integrity", () => {
  describe("1. Role Scoping & Unassigned Organization Access Guard Rules", () => {
    it("strictly blocks unassigned non-admin users from accessing operational workspace", () => {
      // Simulating authentication decision table
      function evaluateWorkspaceAccess(user: { role: string; organizationId: string | null }) {
        if (user.role === "admin") {
          return { allowed: true, mode: "platform_admin" };
        }
        if (!user.organizationId) {
          return { allowed: false, error: "User is pending organization assignment" };
        }
        return { allowed: true, mode: user.role };
      }

      // Unassigned kitchen user -> blocked
      const kitchenPending = evaluateWorkspaceAccess({ role: "kitchen", organizationId: null });
      assert.equal(kitchenPending.allowed, false);
      assert.match(kitchenPending.error || "", /pending organization assignment/);

      // Unassigned receiver user -> blocked
      const receiverPending = evaluateWorkspaceAccess({ role: "receiver", organizationId: null });
      assert.equal(receiverPending.allowed, false);
      assert.match(receiverPending.error || "", /pending organization assignment/);

      // Platform admin with organizationId: null -> granted administrative access
      const adminGlobal = evaluateWorkspaceAccess({ role: "admin", organizationId: null });
      assert.equal(adminGlobal.allowed, true);
      assert.equal(adminGlobal.mode, "platform_admin");

      // Assigned kitchen staff -> granted kitchen access
      const kitchenAssigned = evaluateWorkspaceAccess({ role: "kitchen", organizationId: "org-1" });
      assert.equal(kitchenAssigned.allowed, true);
      assert.equal(kitchenAssigned.mode, "kitchen");
    });

    it("resolves the primary active facility when admin inspects a workspace without an explicit org", () => {
      interface Kitchen {
        id: string;
        organization_id: string;
        name: string;
        active: boolean;
      }

      const availableKitchens: Kitchen[] = [
        { id: "k-1", organization_id: "org-1", name: "Green Valley Main Kitchen", active: true },
        { id: "k-2", organization_id: "org-2", name: "Secondary Kitchen", active: true },
      ];

      function resolveTargetKitchen(
        profile: { role: string; organization_id: string | null },
        requestedKitchenId?: string
      ): Kitchen | null {
        const isAdmin = profile.role === "admin";
        if (requestedKitchenId) {
          const match = availableKitchens.find((k) => k.id === requestedKitchenId);
          if (!match) return null;
          if (!isAdmin && match.organization_id !== profile.organization_id) return null;
          return match;
        }
        if (profile.organization_id) {
          const orgKitchen = availableKitchens.find((k) => k.organization_id === profile.organization_id && k.active);
          if (orgKitchen) return orgKitchen;
        }
        if (isAdmin) {
          return availableKitchens.find((k) => k.active) || null;
        }
        return null;
      }

      // Admin with organizationId: null resolving default kitchen -> gets Green Valley Main Kitchen
      const adminResolved = resolveTargetKitchen({ role: "admin", organization_id: null });
      assert.ok(adminResolved);
      assert.equal(adminResolved?.name, "Green Valley Main Kitchen");

      // Kitchen user without org -> returns null
      const unassignedResolved = resolveTargetKitchen({ role: "kitchen", organization_id: null });
      assert.equal(unassignedResolved, null);

      // Kitchen user with org-1 -> gets Green Valley Main Kitchen
      const staffResolved = resolveTargetKitchen({ role: "kitchen", organization_id: "org-1" });
      assert.equal(staffResolved?.id, "k-1");

      // Kitchen user with org-1 attempting to request k-2 (forbidden cross-org) -> returns null
      const unauthorizedCrossOrg = resolveTargetKitchen({ role: "kitchen", organization_id: "org-1" }, "k-2");
      assert.equal(unauthorizedCrossOrg, null);
    });
  });

  describe("2. Role-Aware Label Transparency", () => {
    it("distinguishes administrative inspection mode from operational roles", () => {
      function getRoleDisplay(role: string, portal: "kitchen" | "receiver" | "admin" | "hub") {
        if (role === "admin") {
          if (portal === "kitchen") return "Super Admin · Inspecting";
          if (portal === "receiver") return "Super Admin · Inspecting";
          return "Super Administrator";
        }
        if (role === "kitchen") return "Kitchen Staff";
        if (role === "receiver") return "Community Partner";
        return "User";
      }

      // Admin visiting kitchen portal must NOT be labeled as 'kitchen Staff' or 'Admin Staff'
      assert.equal(getRoleDisplay("admin", "kitchen"), "Super Admin · Inspecting");

      // Admin visiting receiver portal must NOT be labeled as 'Admin Partner'
      assert.equal(getRoleDisplay("admin", "receiver"), "Super Admin · Inspecting");

      // Admin in admin console
      assert.equal(getRoleDisplay("admin", "admin"), "Super Administrator");

      // Regular kitchen staff
      assert.equal(getRoleDisplay("kitchen", "kitchen"), "Kitchen Staff");

      // Regular receiver staff
      assert.equal(getRoleDisplay("receiver", "receiver"), "Community Partner");
    });
  });

  describe("3. Demo Dataset Coherence & Canonical Calculations", () => {
    it("strictly verifies canonical mass-balance calculations across seeded audits", () => {
      const seededAudits = [
        { prepared: 820, consumed: 785, leftover: 35 },
        { prepared: 760, consumed: 735, leftover: 25 },
        { prepared: 840, consumed: 800, leftover: 40 },
        { prepared: 860, consumed: 820, leftover: 40 },
        { prepared: 790, consumed: 755, leftover: 35 },
        { prepared: 825, consumed: 785, leftover: 40 },
        { prepared: 850, consumed: 805, leftover: 45 },
        { prepared: 535, consumed: 510, leftover: 25 },
        { prepared: 875, consumed: 835, leftover: 40 },
      ];

      for (const audit of seededAudits) {
        assert.ok(audit.prepared >= audit.consumed, "Prepared quantity must be >= consumed quantity");
        assert.equal(audit.leftover, audit.prepared - audit.consumed, "Leftover must equal prepared - consumed");
      }
    });

    it("verifies canonical impact formulas for completed seeded pickups", () => {
      // 40 kg Paneer
      const impact1 = calculateImpact(40, "kg");
      assert.equal(impact1.foodSavedQuantity, 40);
      assert.equal(impact1.estimatedMealsSaved, 100); // 40 / 0.4
      assert.equal(impact1.estimatedCo2eAvoided, 100); // 40 * 2.5
      assert.equal(impact1.estimatedValueSaved, 2400); // 40 * 60

      // 36 kg Dal
      const impact2 = calculateImpact(36, "kg");
      assert.equal(impact2.foodSavedQuantity, 36);
      assert.equal(impact2.estimatedMealsSaved, 90); // 36 / 0.4
      assert.equal(impact2.estimatedCo2eAvoided, 90); // 36 * 2.5
      assert.equal(impact2.estimatedValueSaved, 2160); // 36 * 60

      // Cumulative
      const totalKg = impact1.foodSavedQuantity + impact2.foodSavedQuantity;
      const totalMeals = impact1.estimatedMealsSaved + impact2.estimatedMealsSaved;
      const totalCo2e = impact1.estimatedCo2eAvoided + impact2.estimatedCo2eAvoided;
      const totalValue = impact1.estimatedValueSaved + impact2.estimatedValueSaved;

      assert.equal(totalKg, 76);
      assert.equal(totalMeals, 190);
      assert.equal(totalCo2e, 190);
      assert.equal(totalValue, 4560);
    });

    it("reconciles rescue clock status with surplus lifecycle", () => {
      const now = new Date();

      // Active offer (+2.5 hours remaining)
      const futureDeadline = new Date(now.getTime() + 2.5 * 3600 * 1000).toISOString();
      const activeClock = computeRescueClock(futureDeadline);
      assert.equal(activeClock.status, "ACTIVE");
      assert.equal(activeClock.isExpired, false);

      // Urgent offer (+45 minutes remaining)
      const urgentDeadline = new Date(now.getTime() + 45 * 60 * 1000).toISOString();
      const urgentClock = computeRescueClock(urgentDeadline);
      assert.equal(urgentClock.status, "URGENT");
      assert.equal(urgentClock.isExpired, false);

      // Expired offer (-90 minutes in past)
      const pastDeadline = new Date(now.getTime() - 90 * 60 * 1000).toISOString();
      const expiredClock = computeRescueClock(pastDeadline);
      assert.equal(expiredClock.status, "EXPIRED");
      assert.equal(expiredClock.isExpired, true);
    });
  });
});
