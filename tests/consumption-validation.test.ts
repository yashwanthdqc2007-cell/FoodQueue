import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createConsumptionSchema } from "../lib/validation/consumption";

describe("Consumption Audit Validation Schemas & Business Rules", () => {
  const validMealId = "40000000-0000-0000-0000-000000000001";

  it("accepts a perfectly balanced consumption audit", () => {
    const payload = {
      mealId: validMealId,
      actualConsumers: 800,
      preparedQuantity: 850,
      consumedQuantity: 805,
      leftoverQuantity: 45,
    };

    const result = createConsumptionSchema.safeParse(payload);
    assert.ok(result.success);
  });

  it("rejects when consumed quantity exceeds prepared quantity", () => {
    const payload = {
      mealId: validMealId,
      actualConsumers: 900,
      preparedQuantity: 800,
      consumedQuantity: 850, // > 800
      leftoverQuantity: 0,
    };

    const result = createConsumptionSchema.safeParse(payload);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.errors.some((e) => e.message.includes("Consumed quantity cannot exceed")));
    }
  });

  it("rejects when leftover quantity exceeds prepared quantity", () => {
    const payload = {
      mealId: validMealId,
      actualConsumers: 100,
      preparedQuantity: 500,
      consumedQuantity: 100,
      leftoverQuantity: 550, // > 500
    };

    const result = createConsumptionSchema.safeParse(payload);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.errors.some((e) => e.message.includes("Leftover quantity cannot exceed")));
    }
  });

  it("rejects when combined consumed and leftover exceeds prepared by > 5%", () => {
    const payload = {
      mealId: validMealId,
      actualConsumers: 500,
      preparedQuantity: 100,
      consumedQuantity: 60,
      leftoverQuantity: 50, // 60 + 50 = 110 > 105 (100 * 1.05)
    };

    const result = createConsumptionSchema.safeParse(payload);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.errors.some((e) => e.message.includes("5% tolerance")));
    }
  });

  it("accepts slight measurement variance within 5% tolerance", () => {
    const payload = {
      mealId: validMealId,
      actualConsumers: 500,
      preparedQuantity: 100,
      consumedQuantity: 60,
      leftoverQuantity: 44, // 60 + 44 = 104 <= 105 (100 * 1.05)
    };

    const result = createConsumptionSchema.safeParse(payload);
    assert.ok(result.success);
  });

  it("enforces zero headcount rule: actualConsumers=0 requires consumed=0 and leftover=prepared", () => {
    // Valid zero consumer case (e.g. cancelled event, all food leftover)
    const validZero = {
      mealId: validMealId,
      actualConsumers: 0,
      preparedQuantity: 500,
      consumedQuantity: 0,
      leftoverQuantity: 500,
    };
    assert.ok(createConsumptionSchema.safeParse(validZero).success);

    // Invalid zero consumer case with non-zero consumption
    const invalidZero = {
      mealId: validMealId,
      actualConsumers: 0,
      preparedQuantity: 500,
      consumedQuantity: 50,
      leftoverQuantity: 450,
    };
    const res = createConsumptionSchema.safeParse(invalidZero);
    assert.equal(res.success, false);
  });

  it("rejects negative quantities and non-integer consumers", () => {
    const negativeQty = {
      mealId: validMealId,
      actualConsumers: 100,
      preparedQuantity: -10,
      consumedQuantity: 50,
      leftoverQuantity: 0,
    };
    assert.equal(createConsumptionSchema.safeParse(negativeQty).success, false);

    const floatConsumers = {
      mealId: validMealId,
      actualConsumers: 100.5,
      preparedQuantity: 100,
      consumedQuantity: 50,
      leftoverQuantity: 50,
    };
    assert.equal(createConsumptionSchema.safeParse(floatConsumers).success, false);
  });
});
