import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateRecoveryDecision } from "../lib/rules/recovery-engine";

describe("Deterministic Food Recovery Decision Engine", () => {
  const now = new Date("2026-10-08T12:00:00Z");

  it("1. Evaluates active edible surplus with ample time as REDISTRIBUTE", () => {
    const decision = evaluateRecoveryDecision({
      status: "active",
      category: "edible_surplus",
      quantity: 25,
      redistributionDeadline: "2026-10-08T15:00:00Z", // 3 hours remaining (> 60m)
      aiConfidence: 0.92,
      now,
    });

    assert.equal(decision.path, "REDISTRIBUTE");
    assert.equal(decision.eligible, true);
    assert.equal(decision.urgency, "ACTIVE");
    assert.ok(decision.reasonCodes.includes("EDIBLE_SURPLUS_ACTIVE"));
    assert.equal(decision.hasAiAssessment, true);
  });

  it("2. Evaluates active edible surplus with <= 60 minutes as URGENT REDISTRIBUTE", () => {
    const decision = evaluateRecoveryDecision({
      status: "active",
      category: "edible_surplus",
      quantity: 15,
      redistributionDeadline: "2026-10-08T12:45:00Z", // 45 mins remaining
      aiConfidence: 0.88,
      now,
    });

    assert.equal(decision.path, "REDISTRIBUTE");
    assert.equal(decision.eligible, true);
    assert.equal(decision.urgency, "URGENT");
    assert.ok(decision.reasonCodes.includes("HIGH_URGENCY_DEADLINE_NEAR"));
  });

  it("3. Routes unsafe food immediately to DISPOSE regardless of time", () => {
    const decision = evaluateRecoveryDecision({
      status: "active",
      category: "unsafe",
      quantity: 50,
      redistributionDeadline: "2026-10-08T18:00:00Z",
      aiConfidence: 0.95,
      now,
    });

    assert.equal(decision.path, "DISPOSE");
    assert.equal(decision.eligible, false);
    assert.equal(decision.urgency, "EXPIRED");
    assert.ok(decision.reasonCodes.includes("UNSAFE_FOOD_CATEGORY"));
  });

  it("4. Evaluates expired edible surplus as RECOVERY (or disposal/feed diversion)", () => {
    const decision = evaluateRecoveryDecision({
      status: "active",
      category: "edible_surplus",
      quantity: 30,
      redistributionDeadline: "2026-10-08T11:00:00Z", // 1 hour past deadline
      aiConfidence: 0.90,
      now,
    });

    assert.equal(decision.path, "RECOVERY");
    assert.equal(decision.eligible, false);
    assert.equal(decision.urgency, "EXPIRED");
    assert.ok(decision.reasonCodes.includes("REDISTRIBUTION_DEADLINE_EXPIRED"));
  });

  it("5. Routes organic category to RECOVERY for composting", () => {
    const decision = evaluateRecoveryDecision({
      status: "active",
      category: "organic",
      quantity: 40,
      redistributionDeadline: "2026-10-08T14:00:00Z",
      now,
    });

    assert.equal(decision.path, "RECOVERY");
    assert.equal(decision.eligible, true);
    assert.ok(decision.reasonCodes.includes("ORGANIC_COMPOSTING_PATHWAY"));
    assert.equal(decision.hasAiAssessment, false);
  });

  it("6. Routes reusable ingredients to RECOVERY for culinary repurposing", () => {
    const decision = evaluateRecoveryDecision({
      status: "active",
      category: "reusable",
      quantity: 12,
      redistributionDeadline: "2026-10-08T16:00:00Z",
      now,
    });

    assert.equal(decision.path, "RECOVERY");
    assert.equal(decision.eligible, true);
    assert.ok(decision.reasonCodes.includes("REUSABLE_INGREDIENT_PATHWAY"));
  });

  it("7. Handles unknown / unclassified category gracefully as pending review", () => {
    const decision = evaluateRecoveryDecision({
      status: "active",
      category: "unknown",
      quantity: 20,
      redistributionDeadline: "2026-10-08T14:00:00Z",
      now,
    });

    assert.equal(decision.path, "REDISTRIBUTE");
    assert.equal(decision.eligible, true);
    assert.ok(decision.reasonCodes.includes("CATEGORY_UNCLASSIFIED"));
  });

  it("8. Preserves terminal disposed status", () => {
    const decision = evaluateRecoveryDecision({
      status: "disposed",
      category: "edible_surplus",
      quantity: 10,
      now,
    });

    assert.equal(decision.path, "DISPOSE");
    assert.equal(decision.eligible, false);
    assert.ok(decision.reasonCodes.includes("STATUS_DISPOSED"));
  });
});
