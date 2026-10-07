import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { registerSchema, loginSchema } from "../lib/validation/auth";
import { createOrganizationSchema, assignUserSchema } from "../lib/validation/admin";
import { successResponse, errorResponse } from "../lib/api-response";

describe("Phase 1 Validation & Auth Security Tests", () => {
  describe("Registration Schema Validation", () => {
    test("accepts valid registration payload", () => {
      const validPayload = {
        fullName: "Chef Ramesh Kumar",
        email: "ramesh@greenvalley.org",
        password: "SecurePassword123!",
        confirmPassword: "SecurePassword123!",
      };

      const result = registerSchema.safeParse(validPayload);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.email, "ramesh@greenvalley.org");
        assert.equal(result.data.fullName, "Chef Ramesh Kumar");
      }
    });

    test("rejects mismatched passwords", () => {
      const payload = {
        fullName: "Chef Ramesh Kumar",
        email: "ramesh@greenvalley.org",
        password: "SecurePassword123!",
        confirmPassword: "DifferentPassword456!",
      };

      const result = registerSchema.safeParse(payload);
      assert.equal(result.success, false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        assert.ok(errors.confirmPassword);
        assert.equal(errors.confirmPassword[0], "Passwords do not match");
      }
    });

    test("rejects password shorter than 8 characters", () => {
      const payload = {
        fullName: "Chef Ramesh",
        email: "ramesh@greenvalley.org",
        password: "short",
        confirmPassword: "short",
      };

      const result = registerSchema.safeParse(payload);
      assert.equal(result.success, false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        assert.ok(errors.password);
      }
    });

    test("rejects invalid email address", () => {
      const payload = {
        fullName: "Chef Ramesh",
        email: "not-an-email",
        password: "SecurePassword123!",
        confirmPassword: "SecurePassword123!",
      };

      const result = registerSchema.safeParse(payload);
      assert.equal(result.success, false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        assert.ok(errors.email);
      }
    });
  });

  describe("Login Schema Validation", () => {
    test("accepts valid login credentials", () => {
      const payload = {
        email: "user@institution.org",
        password: "Password123!",
      };

      const result = loginSchema.safeParse(payload);
      assert.equal(result.success, true);
    });

    test("rejects invalid email format", () => {
      const payload = {
        email: "invalid-email",
        password: "Password123!",
      };

      const result = loginSchema.safeParse(payload);
      assert.equal(result.success, false);
    });
  });

  describe("Admin Organization Schema Validation", () => {
    test("accepts valid kitchen organization creation payload", () => {
      const payload = {
        name: "Central Dining Kitchen",
        organizationType: "kitchen",
        address: "123 Main St, Bangalore",
        kitchen: {
          name: "Main Prep Kitchen",
          timezone: "Asia/Kolkata",
        },
      };

      const result = createOrganizationSchema.safeParse(payload);
      assert.equal(result.success, true);
    });

    test("accepts valid receiver organization creation payload", () => {
      const payload = {
        name: "Hope Food Shelter",
        organizationType: "receiver",
        receiver: {
          receiverType: "shelter",
          maxCapacity: 500,
          acceptedFoodTypes: ["cooked_meals", "packaged_dry"],
        },
      };

      const result = createOrganizationSchema.safeParse(payload);
      assert.equal(result.success, true);
    });

    test("rejects invalid organization type", () => {
      const payload = {
        name: "Invalid Org",
        organizationType: "super_admin_corp",
      };

      const result = createOrganizationSchema.safeParse(payload);
      assert.equal(result.success, false);
    });
    test("rejects snake_case keys for organization creation (reproducing 400)", () => {
      const browserPayload = {
        name: "Demo Institutional Kitchen",
        organization_type: "kitchen",
        address: "Chennai, Tamil Nadu",
        latitude: 13.0827,
        longitude: 80.2707,
        contact_phone: "+91-9000000000",
      };

      const result = createOrganizationSchema.safeParse(browserPayload);
      assert.equal(result.success, false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        assert.ok(errors.organizationType, "Must fail because organizationType is missing (sent organization_type)");
      }
    });
  });

  describe("Admin User Assignment Schema Validation", () => {
    test("accepts valid assignment payload", () => {
      const payload = {
        userId: "11111111-1111-4111-8111-111111111111",
        organizationId: "22222222-2222-4222-8222-222222222222",
        role: "kitchen",
      };

      const result = assignUserSchema.safeParse(payload);
      assert.equal(result.success, true);
    });

    test("rejects placeholder and snake_case assignment payload (reproducing 400)", () => {
      const placeholderPayload = {
        user_id: "YOUR_TEST_USER_UUID",
        organization_id: "YOUR_NEW_ORGANIZATION_UUID",
        role: "kitchen",
      };

      const result = assignUserSchema.safeParse(placeholderPayload);
      assert.equal(result.success, false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        assert.ok(errors.userId, "Must fail because userId is missing (sent user_id) or invalid UUID");
        assert.ok(errors.organizationId, "Must fail because organizationId is missing (sent organization_id) or invalid UUID");
      }
    });

    test("rejects non-UUID identifier", () => {
      const payload = {
        userId: "not-a-uuid",
        organizationId: "22222222-2222-4222-8222-222222222222",
        role: "kitchen",
      };

      const result = assignUserSchema.safeParse(payload);
      assert.equal(result.success, false);
    });

    test("rejects invalid role value", () => {
      const payload = {
        userId: "11111111-1111-4111-8111-111111111111",
        organizationId: "22222222-2222-4222-8222-222222222222",
        role: "super_user",
      };

      const result = assignUserSchema.safeParse(payload);
      assert.equal(result.success, false);
    });
  });

  describe("API Response Envelopes", () => {
    test("generates standard success envelope", async () => {
      const res = successResponse({ status: "active" }, 200);
      const json = await res.json();
      assert.equal(res.status, 200);
      assert.deepEqual(json, {
        data: { status: "active" },
        error: null,
      });
    });

    test("generates standard error envelope", async () => {
      const res = errorResponse("FORBIDDEN", "Admin privileges required", 403);
      const json = await res.json();
      assert.equal(res.status, 403);
      assert.deepEqual(json, {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Admin privileges required",
          details: null,
        },
      });
    });
  });
});
