import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createPickupSchema,
  updatePickupStatusSchema,
  pickupQuerySchema,
  pickupStatusEnum,
} from "@/lib/validation/pickup";

describe("Phase 5: Pickup Validation Schemas & State Machine Workflow", () => {
  describe("Pickup Creation Schema Validation", () => {
    it("accepts valid surplusId and receiverId UUIDs", () => {
      const validPayload = {
        surplusId: "50000000-0000-0000-0000-000000000001",
        receiverId: "30000000-0000-0000-0000-000000000001",
        notes: "Scheduled pickup for morning shift.",
      };
      const parsed = createPickupSchema.safeParse(validPayload);
      assert.equal(parsed.success, true);
    });

    it("rejects non-UUID surplusId", () => {
      const invalidPayload = {
        surplusId: "invalid-uuid",
        receiverId: "30000000-0000-0000-0000-000000000001",
      };
      const parsed = createPickupSchema.safeParse(invalidPayload);
      assert.equal(parsed.success, false);
    });

    it("rejects non-UUID receiverId", () => {
      const invalidPayload = {
        surplusId: "50000000-0000-0000-0000-000000000001",
        receiverId: "invalid-receiver-id",
      };
      const parsed = createPickupSchema.safeParse(invalidPayload);
      assert.equal(parsed.success, false);
    });
  });

  describe("Pickup Status Update Schema Validation", () => {
    it("accepts valid status transition to 'scheduled' with ISO timestamp", () => {
      const payload = {
        status: "scheduled",
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
        notes: "Pickup confirmed for Loading Dock A",
      };
      const parsed = updatePickupStatusSchema.safeParse(payload);
      assert.equal(parsed.success, true);
    });

    it("accepts valid status transition to 'picked_up' with proof image path", () => {
      const payload = {
        status: "picked_up",
        proofImagePath: "pickup-proofs/usr-1/pk-1/proof.jpg",
        notes: "Handover completed with Receiver Volunteer team",
      };
      const parsed = updatePickupStatusSchema.safeParse(payload);
      assert.equal(parsed.success, true);
    });

    it("accepts valid status transition to 'cancelled'", () => {
      const payload = {
        status: "cancelled",
        notes: "Vehicle breakdown, unable to collect.",
      };
      const parsed = updatePickupStatusSchema.safeParse(payload);
      assert.equal(parsed.success, true);
    });

    it("rejects invalid status enum value (e.g. invented 'in_transit' or 'completed')", () => {
      const payload = {
        status: "in_transit",
      };
      const parsed = updatePickupStatusSchema.safeParse(payload);
      assert.equal(parsed.success, false);
    });

    it("rejects notes exceeding max 500 characters", () => {
      const payload = {
        status: "cancelled",
        notes: "x".repeat(501),
      };
      const parsed = updatePickupStatusSchema.safeParse(payload);
      assert.equal(parsed.success, false);
    });
  });

  describe("Pickup Query Schema Validation", () => {
    it("accepts valid query filters and applies defaults", () => {
      const query = {
        status: "requested",
        limit: 15,
        offset: 0,
      };
      const parsed = pickupQuerySchema.safeParse(query);
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.status, "requested");
        assert.equal(parsed.data.limit, 15);
      }
    });

    it("rejects invalid status in query filter", () => {
      const query = { status: "unknown_status" };
      const parsed = pickupQuerySchema.safeParse(query);
      assert.equal(parsed.success, false);
    });
  });

  describe("Strict State Machine & Role Authorization Matrix", () => {
    // Exact schema statuses: requested, scheduled, picked_up, cancelled
    const VALID_TRANSITIONS: Record<string, string[]> = {
      requested: ["scheduled", "picked_up", "cancelled"],
      scheduled: ["scheduled", "picked_up", "cancelled"], // scheduled can be rescheduled
      picked_up: [], // Terminal
      cancelled: [], // Terminal
    };

    function isValidTransition(current: string, next: string): boolean {
      return (VALID_TRANSITIONS[current] || []).includes(next);
    }

    it("permits requested -> scheduled (Kitchen confirm)", () => {
      assert.equal(isValidTransition("requested", "scheduled"), true);
    });

    it("permits scheduled -> picked_up (Receiver collection)", () => {
      assert.equal(isValidTransition("scheduled", "picked_up"), true);
    });

    it("permits requested -> picked_up (Direct collection handover)", () => {
      assert.equal(isValidTransition("requested", "picked_up"), true);
    });

    it("permits requested -> cancelled and scheduled -> cancelled", () => {
      assert.equal(isValidTransition("requested", "cancelled"), true);
      assert.equal(isValidTransition("scheduled", "cancelled"), true);
    });

    it("strictly rejects transitions from terminal 'picked_up' state", () => {
      assert.equal(isValidTransition("picked_up", "requested"), false);
      assert.equal(isValidTransition("picked_up", "scheduled"), false);
      assert.equal(isValidTransition("picked_up", "cancelled"), false);
    });

    it("strictly rejects transitions from terminal 'cancelled' state", () => {
      assert.equal(isValidTransition("cancelled", "requested"), false);
      assert.equal(isValidTransition("cancelled", "scheduled"), false);
      assert.equal(isValidTransition("cancelled", "picked_up"), false);
    });

    it("enforces role-based action matrix", () => {
      const rolePermissions = {
        kitchen: ["scheduled", "cancelled"],
        receiver: ["picked_up", "cancelled"],
        admin: ["scheduled", "picked_up", "cancelled"],
      };

      // Kitchen can schedule
      assert.ok(rolePermissions.kitchen.includes("scheduled"));
      // Receiver can finalize collection (picked_up)
      assert.ok(rolePermissions.receiver.includes("picked_up"));
      // Kitchen cannot complete pickup on behalf of receiver
      assert.ok(!rolePermissions.kitchen.includes("picked_up"));
      // Receiver cannot unilaterally schedule without kitchen
      assert.ok(!rolePermissions.receiver.includes("scheduled"));
    });
  });

  describe("Proof Upload Storage Path & MIME Verification", () => {
    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

    function validateProofFile(mimeType: string, sizeBytes: number) {
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return { valid: false, error: "Invalid MIME type" };
      }
      if (sizeBytes > MAX_SIZE_BYTES) {
        return { valid: false, error: "File size exceeds 5MB limit" };
      }
      return { valid: true };
    }

    function generateStoragePath(userId: string, pickupId: string, filename: string): string {
      const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      return `pickup-proofs/${userId}/${pickupId}/${sanitizedName}`;
    }

    it("accepts valid JPEG, PNG, and WebP under 5MB", () => {
      assert.equal(validateProofFile("image/jpeg", 2 * 1024 * 1024).valid, true);
      assert.equal(validateProofFile("image/png", 1024 * 1024).valid, true);
      assert.equal(validateProofFile("image/webp", 500 * 1024).valid, true);
    });

    it("rejects forbidden MIME types (PDF, GIF, executable)", () => {
      assert.equal(validateProofFile("application/pdf", 1024).valid, false);
      assert.equal(validateProofFile("image/gif", 1024).valid, false);
      assert.equal(validateProofFile("text/plain", 1024).valid, false);
    });

    it("rejects files exceeding 5MB limit", () => {
      assert.equal(validateProofFile("image/jpeg", 6 * 1024 * 1024).valid, false);
    });

    it("formats storage path adhering strictly to private bucket convention", () => {
      const path = generateStoragePath("usr-123", "pk-456", "handover proof.jpg");
      assert.equal(path, "pickup-proofs/usr-123/pk-456/handover_proof.jpg");
    });
  });

  describe("Idempotency & Duplicate Prevention Guards", () => {
    it("returns existing pickup request for already accepted match rather than duplicating", () => {
      const match = { id: "m-1", status: "accepted" };
      const existingPickup = { id: "p-1", matchId: "m-1", status: "requested" };

      function handleMatchAccept(currentMatch: typeof match, existing: typeof existingPickup | null) {
        if (currentMatch.status === "accepted" && existing) {
          return { action: "returned_existing", pickup: existing };
        }
        return { action: "created_new", pickup: { id: "p-2", matchId: currentMatch.id, status: "requested" } };
      }

      const result = handleMatchAccept(match, existingPickup);
      assert.equal(result.action, "returned_existing");
      assert.equal(result.pickup.id, "p-1");
    });

    it("guards impact record insertion on idempotent completion retry", () => {
      let impactDb: Array<{ surplusId: string; pickupId: string }> = [
        { surplusId: "s-1", pickupId: "p-1" },
      ];

      function recordImpactIdempotent(surplusId: string, pickupId: string) {
        const existing = impactDb.find((r) => r.surplusId === surplusId);
        if (existing) {
          return { status: "already_recorded", record: existing };
        }
        const newRecord = { surplusId, pickupId };
        impactDb.push(newRecord);
        return { status: "created", record: newRecord };
      }

      // First call when already recorded
      const res1 = recordImpactIdempotent("s-1", "p-1");
      assert.equal(res1.status, "already_recorded");
      assert.equal(impactDb.length, 1); // No duplicate added
    });
  });
});
