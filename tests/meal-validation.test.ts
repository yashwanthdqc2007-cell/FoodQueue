import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMealSchema, updateMealSchema, mealQuerySchema } from "../lib/validation/meal";

describe("Meal Validation Schemas & Input Guards", () => {
  const validKitchenId = "20000000-0000-0000-0000-000000000001";

  it("accepts valid meal creation payload", () => {
    const payload = {
      kitchenId: validKitchenId,
      mealName: "Wednesday Lunch Thali",
      mealDate: "2026-10-14",
      mealPeriod: "lunch",
      expectedConsumers: 800,
      plannedQuantity: 850,
      unit: "servings",
    };

    const result = createMealSchema.safeParse(payload);
    assert.ok(result.success);
  });

  it("rejects invalid meal period enum", () => {
    const payload = {
      kitchenId: validKitchenId,
      mealName: "Midnight Feast",
      mealDate: "2026-10-14",
      mealPeriod: "midnight", // invalid enum
      expectedConsumers: 100,
      plannedQuantity: 100,
    };

    const result = createMealSchema.safeParse(payload);
    assert.equal(result.success, false);
  });

  it("rejects negative or zero planned quantity", () => {
    const zeroQty = {
      kitchenId: validKitchenId,
      mealName: "Zero Meal",
      mealDate: "2026-10-14",
      mealPeriod: "breakfast",
      expectedConsumers: 100,
      plannedQuantity: 0, // Must be > 0
    };
    assert.equal(createMealSchema.safeParse(zeroQty).success, false);

    const negQty = {
      ...zeroQty,
      plannedQuantity: -50,
    };
    assert.equal(createMealSchema.safeParse(negQty).success, false);
  });

  it("rejects negative expected consumers", () => {
    const negConsumers = {
      kitchenId: validKitchenId,
      mealName: "Neg Pax Meal",
      mealDate: "2026-10-14",
      mealPeriod: "dinner",
      expectedConsumers: -5,
      plannedQuantity: 100,
    };
    assert.equal(createMealSchema.safeParse(negConsumers).success, false);
  });

  it("rejects malformed date strings", () => {
    const badDate = {
      kitchenId: validKitchenId,
      mealName: "Bad Date Meal",
      mealDate: "14/10/2026", // must be YYYY-MM-DD
      mealPeriod: "lunch",
      expectedConsumers: 100,
      plannedQuantity: 100,
    };
    assert.equal(createMealSchema.safeParse(badDate).success, false);
  });

  it("validates meal update schema", () => {
    const validUpdate = {
      mealName: "Updated Thursday Lunch",
      plannedQuantity: 920,
    };
    assert.ok(updateMealSchema.safeParse(validUpdate).success);
  });

  it("validates meal query parameters and pagination defaults", () => {
    const query = {
      startDate: "2026-10-01",
      endDate: "2026-10-15",
      mealPeriod: "lunch",
    };
    const parsed = mealQuerySchema.safeParse(query);
    assert.ok(parsed.success);
    if (parsed.success) {
      assert.equal(parsed.data.limit, 50);
      assert.equal(parsed.data.offset, 0);
    }
  });
});
