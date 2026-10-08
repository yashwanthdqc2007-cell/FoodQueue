import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSurplusHandoffSchema } from "../lib/validation/surplus";

describe("Surplus Handoff Validation Schemas & Integration Boundary", () => {
  const validKitchenId = "20000000-0000-0000-0000-000000000001";
  const validMealId = "40000000-0000-0000-0000-000000000001";

  it("accepts valid surplus handoff payload", () => {
    const payload = {
      kitchenId: validKitchenId,
      sourceMealId: validMealId,
      foodName: "Steamed Rice & Veg Curry",
      quantity: 45.5,
      unit: "kg",
      preparedAt: new Date().toISOString(),
      redistributionDeadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      notes: "Packed in sanitized food-grade stainless steel containers.",
    };

    const result = createSurplusHandoffSchema.safeParse(payload);
    assert.ok(result.success);
  });

  it("rejects zero or negative surplus quantity", () => {
    const zeroQty = {
      kitchenId: validKitchenId,
      sourceMealId: validMealId,
      foodName: "Leftover Rice",
      quantity: 0,
      unit: "kg",
    };
    assert.equal(createSurplusHandoffSchema.safeParse(zeroQty).success, false);

    const negQty = {
      ...zeroQty,
      quantity: -15,
    };
    assert.equal(createSurplusHandoffSchema.safeParse(negQty).success, false);
  });

  it("rejects invalid UUIDs", () => {
    const badKitchenId = {
      kitchenId: "not-a-uuid",
      sourceMealId: validMealId,
      foodName: "Leftover Rice",
      quantity: 20,
      unit: "kg",
    };
    assert.equal(createSurplusHandoffSchema.safeParse(badKitchenId).success, false);
  });

  it("rejects empty food names", () => {
    const emptyName = {
      kitchenId: validKitchenId,
      sourceMealId: validMealId,
      foodName: " ",
      quantity: 20,
      unit: "kg",
    };
    assert.equal(createSurplusHandoffSchema.safeParse(emptyName).success, false);
  });
});
