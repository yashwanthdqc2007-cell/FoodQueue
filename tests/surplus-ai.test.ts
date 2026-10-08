import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aiStructuredOutputSchema,
  aiClassificationRequestSchema,
  updateSurplusSchema,
  surplusQuerySchema,
} from "../lib/validation/surplus";

describe("Surplus AI Validation Schemas & Contracts", () => {
  it("1. Accepts valid structured AI output", () => {
    const validOutput = {
      foodType: "Steamed Basmati Rice",
      category: "edible_surplus",
      visibleCondition: "Hot steam visible, grains separate and white, stainless steel container",
      confidence: 0.94,
      notes: "Suitable for immediate hot redistribution.",
    };

    const result = aiStructuredOutputSchema.safeParse(validOutput);
    assert.ok(result.success);
    if (result.success) {
      assert.equal(result.data.category, "edible_surplus");
      assert.equal(result.data.confidence, 0.94);
    }
  });

  it("2. Rejects AI confidence outside [0, 1]", () => {
    const highConfidence = {
      foodType: "Vegetable Curry",
      category: "edible_surplus",
      visibleCondition: "Good texture",
      confidence: 1.5,
    };
    assert.equal(aiStructuredOutputSchema.safeParse(highConfidence).success, false);

    const negConfidence = {
      foodType: "Vegetable Curry",
      category: "edible_surplus",
      visibleCondition: "Good texture",
      confidence: -0.2,
    };
    assert.equal(aiStructuredOutputSchema.safeParse(negConfidence).success, false);
  });

  it("3. Rejects invalid or unsupported category enum from AI", () => {
    const badCategory = {
      foodType: "Bread Loaves",
      category: "fresh_bakery", // Not in schema enum
      visibleCondition: "Intact packaging",
      confidence: 0.90,
    };
    assert.equal(aiStructuredOutputSchema.safeParse(badCategory).success, false);
  });

  it("4. Rejects missing food type or empty visible condition", () => {
    const missingFood = {
      foodType: " ",
      category: "edible_surplus",
      visibleCondition: "Clear image",
      confidence: 0.80,
    };
    assert.equal(aiStructuredOutputSchema.safeParse(missingFood).success, false);

    const missingCondition = {
      foodType: "Cooked Dal",
      category: "edible_surplus",
      visibleCondition: "",
      confidence: 0.80,
    };
    assert.equal(aiStructuredOutputSchema.safeParse(missingCondition).success, false);
  });

  it("5. Validates classification request payload", () => {
    const validRequest = {
      surplusId: "50000000-0000-0000-0000-000000000001",
      notes: "Prepared at lunch shift, maintained at safe temperature.",
    };
    assert.ok(aiClassificationRequestSchema.safeParse(validRequest).success);

    const invalidUuid = {
      surplusId: "not-a-uuid",
    };
    assert.equal(aiClassificationRequestSchema.safeParse(invalidUuid).success, false);
  });

  it("6. Validates surplus update schema", () => {
    const validUpdate = {
      status: "recovered",
      category: "organic",
      notes: "Diverted to municipal bio-composting.",
    };
    assert.ok(updateSurplusSchema.safeParse(validUpdate).success);

    const invalidStatus = {
      status: "sold_to_customer", // unsupported enum
    };
    assert.equal(updateSurplusSchema.safeParse(invalidStatus).success, false);
  });

  it("7. Validates surplus query schema with defaults", () => {
    const result = surplusQuerySchema.safeParse({});
    assert.ok(result.success);
    if (result.success) {
      assert.equal(result.data.limit, 50);
      assert.equal(result.data.offset, 0);
    }
  });
});
