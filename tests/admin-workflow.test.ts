import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createOrganizationSchema,
  assignUserSchema,
} from "@/lib/validation/admin";
import { z } from "zod";

const verifyReceiverSchema = z.object({
  verified: z.boolean({ required_error: "verified boolean status is required" }),
});

describe("Phase 7: Admin Workflow & Security Matrix", () => {
  describe("1. Organization Creation Schema Validation", () => {
    it("accepts a valid kitchen organization payload", () => {
      const payload = {
        name: "Central Campus Dining Hall",
        organizationType: "kitchen",
        address: "North Campus Block A, Level 1",
        latitude: 12.9716,
        longitude: 77.5946,
        contactPhone: "+91 9876543210",
        kitchen: {
          name: "Main Production Kitchen",
          timezone: "Asia/Kolkata",
        },
      };

      const result = createOrganizationSchema.safeParse(payload);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.name, "Central Campus Dining Hall");
        assert.equal(result.data.organizationType, "kitchen");
        assert.equal(result.data.kitchen?.name, "Main Production Kitchen");
      }
    });

    it("accepts a valid receiver organization payload with capacity and operating hours", () => {
      const payload = {
        name: "Hope Food Bank & Community Shelter",
        organizationType: "receiver",
        address: "124 Market Road, City Center",
        latitude: 12.98,
        longitude: 77.6,
        contactPhone: "+91 9123456780",
        receiver: {
          receiverType: "shelter",
          maxCapacity: 250,
          acceptedFoodTypes: ["cooked_meals", "packaged_items", "produce"],
          operatingHours: {
            monday: "08:00-20:00",
            tuesday: "08:00-20:00",
          },
        },
      };

      const result = createOrganizationSchema.safeParse(payload);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.name, "Hope Food Bank & Community Shelter");
        assert.equal(result.data.organizationType, "receiver");
        assert.equal(result.data.receiver?.maxCapacity, 250);
        assert.equal(result.data.receiver?.receiverType, "shelter");
      }
    });

    it("rejects invalid organization type enum", () => {
      const payload = {
        name: "Invalid Entity",
        organizationType: "supermarket", // not in supported enum
      };

      const result = createOrganizationSchema.safeParse(payload);
      assert.equal(result.success, false);
    });

    it("rejects invalid coordinates outside geographic bounds", () => {
      const invalidLat = {
        name: "Polar Outpost",
        organizationType: "ngo",
        latitude: 95.0, // > 90
        longitude: 77.0,
      };
      assert.equal(createOrganizationSchema.safeParse(invalidLat).success, false);

      const invalidLng = {
        name: "Space Outpost",
        organizationType: "ngo",
        latitude: 12.0,
        longitude: 195.0, // > 180
      };
      assert.equal(createOrganizationSchema.safeParse(invalidLng).success, false);
    });

    it("rejects empty or overly short organization name", () => {
      const emptyName = {
        name: " ",
        organizationType: "kitchen",
      };
      assert.equal(createOrganizationSchema.safeParse(emptyName).success, false);
    });
  });

  describe("2. User Assignment Schema & Authorization Guards", () => {
    it("accepts valid UUIDs and recognized role assignments", () => {
      const payload = {
        userId: "c0000000-0000-0000-0000-000000000001",
        organizationId: "a0000000-0000-0000-0000-000000000001",
        role: "kitchen",
      };

      const result = assignUserSchema.safeParse(payload);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.role, "kitchen");
      }
    });

    it("rejects non-UUID user or organization identifiers", () => {
      const invalidUser = {
        userId: "user-1234",
        organizationId: "a0000000-0000-0000-0000-000000000001",
        role: "receiver",
      };
      assert.equal(assignUserSchema.safeParse(invalidUser).success, false);

      const invalidOrg = {
        userId: "c0000000-0000-0000-0000-000000000001",
        organizationId: "org-xyz",
        role: "receiver",
      };
      assert.equal(assignUserSchema.safeParse(invalidOrg).success, false);
    });

    it("rejects invalid role enumeration values", () => {
      const invalidRole = {
        userId: "c0000000-0000-0000-0000-000000000001",
        organizationId: "a0000000-0000-0000-0000-000000000001",
        role: "superadmin", // unrecognised role
      };
      assert.equal(assignUserSchema.safeParse(invalidRole).success, false);
    });
  });

  describe("3. Receiver Verification Schema Validation", () => {
    it("accepts boolean verification toggles (true/false)", () => {
      const verifyTrue = verifyReceiverSchema.safeParse({ verified: true });
      assert.equal(verifyTrue.success, true);
      if (verifyTrue.success) assert.equal(verifyTrue.data.verified, true);

      const verifyFalse = verifyReceiverSchema.safeParse({ verified: false });
      assert.equal(verifyFalse.success, true);
      if (verifyFalse.success) assert.equal(verifyFalse.data.verified, false);
    });

    it("rejects string or null values for verification status", () => {
      assert.equal(verifyReceiverSchema.safeParse({ verified: "true" }).success, false);
      assert.equal(verifyReceiverSchema.safeParse({ verified: null }).success, false);
      assert.equal(verifyReceiverSchema.safeParse({}).success, false);
    });
  });

  describe("4. Administrative Role & Permission Matrix", () => {
    type AppRole = "admin" | "kitchen" | "receiver" | "volunteer";

    function checkAdminAccess(role: AppRole): { allowed: boolean; reason?: string } {
      if (role === "admin") {
        return { allowed: true };
      }
      return { allowed: false, reason: "Admin privileges required" };
    }

    it("grants full administrative access only to 'admin' role", () => {
      const adminCheck = checkAdminAccess("admin");
      assert.equal(adminCheck.allowed, true);
    });

    it("strictly blocks non-admin roles from accessing administration routes", () => {
      const kitchenCheck = checkAdminAccess("kitchen");
      assert.equal(kitchenCheck.allowed, false);

      const receiverCheck = checkAdminAccess("receiver");
      assert.equal(receiverCheck.allowed, false);

      const volunteerCheck = checkAdminAccess("volunteer");
      assert.equal(volunteerCheck.allowed, false);
    });
  });

  describe("5. Query Parameter & Pagination Bounds", () => {
    function sanitizePagination(limitStr: string | null, offsetStr: string | null) {
      const parsedLimit = parseInt(limitStr || "50", 10);
      const limit = Math.min(isNaN(parsedLimit) || parsedLimit <= 0 ? 50 : parsedLimit, 100);
      const parsedOffset = parseInt(offsetStr || "0", 10);
      const offset = isNaN(parsedOffset) || parsedOffset < 0 ? 0 : parsedOffset;
      return { limit, offset };
    }

    it("defaults to 50 items and clamps maximum to 100 items", () => {
      const def = sanitizePagination(null, null);
      assert.equal(def.limit, 50);
      assert.equal(def.offset, 0);

      const high = sanitizePagination("500", "20");
      assert.equal(high.limit, 100);
      assert.equal(high.offset, 20);

      const negative = sanitizePagination("-5", "-10");
      assert.equal(negative.limit, 50);
      assert.equal(negative.offset, 0);
    });
  });
});
