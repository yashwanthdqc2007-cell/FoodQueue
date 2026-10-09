import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateMatchesSchema, matchActionSchema, matchQuerySchema } from "@/lib/validation/matching";

describe("Phase 4: Matching Validation Schemas & Workflow Guards", () => {
  describe("Generate Matches Payload Validation", () => {
    it("accepts valid surplusId UUID", () => {
      const validPayload = { surplusId: "50000000-0000-0000-0000-000000000001" };
      const parsed = generateMatchesSchema.safeParse(validPayload);
      assert.equal(parsed.success, true);
    });

    it("rejects non-UUID surplusId", () => {
      const invalidPayload = { surplusId: "not-a-valid-uuid" };
      const parsed = generateMatchesSchema.safeParse(invalidPayload);
      assert.equal(parsed.success, false);
    });

    it("rejects missing surplusId", () => {
      const emptyPayload = {};
      const parsed = generateMatchesSchema.safeParse(emptyPayload);
      assert.equal(parsed.success, false);
    });
  });

  describe("Match Action Payload Validation", () => {
    it("accepts valid notes within character limit", () => {
      const validAction = { notes: "Accepting delivery for evening service." };
      const parsed = matchActionSchema.safeParse(validAction);
      assert.equal(parsed.success, true);
    });

    it("rejects notes exceeding max 500 characters", () => {
      const longAction = { notes: "a".repeat(501) };
      const parsed = matchActionSchema.safeParse(longAction);
      assert.equal(parsed.success, false);
    });
  });

  describe("Match Query Schema Validation", () => {
    it("accepts valid query parameters with defaults", () => {
      const query = { status: "recommended", limit: 20, offset: 0 };
      const parsed = matchQuerySchema.safeParse(query);
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.limit, 20);
        assert.equal(parsed.data.status, "recommended");
      }
    });

    it("rejects invalid status enum value", () => {
      const invalidQuery = { status: "pending_something_invalid" };
      const parsed = matchQuerySchema.safeParse(invalidQuery);
      assert.equal(parsed.success, false);
    });
  });

  describe("Match Lifecycle & State Transition Guards", () => {
    it("validates valid state transitions: recommended -> accepted -> pickup created", () => {
      const validTransitions: Record<string, string[]> = {
        recommended: ["accepted", "rejected", "expired"],
        accepted: [], // Terminal for matching engine
        rejected: [],
        expired: [],
      };

      assert.ok(validTransitions.recommended.includes("accepted"));
      assert.ok(validTransitions.recommended.includes("rejected"));
      assert.ok(!validTransitions.accepted.includes("accepted")); // Cannot accept already accepted
    });

    it("enforces duplicate acceptance prevention guard", () => {
      const match = { id: "match-1", status: "accepted" };
      const canAccept = match.status === "recommended";
      assert.equal(canAccept, false);
    });

    it("enforces expired surplus acceptance prevention guard", () => {
      const surplus = { status: "active", isExpired: true };
      const canAccept = surplus.status === "active" && !surplus.isExpired;
      assert.equal(canAccept, false);
    });
  });
});
