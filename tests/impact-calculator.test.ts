import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateImpact, normalizeQuantityToKg } from "@/lib/rules/impact-calculator";

describe("Phase 5: Deterministic Impact Calculator", () => {
  describe("Unit Normalization (normalizeQuantityToKg)", () => {
    it("preserves kg directly", () => {
      assert.equal(normalizeQuantityToKg(25, "kg"), 25);
      assert.equal(normalizeQuantityToKg(10.5, "kg"), 10.5);
    });

    it("normalizes servings to kg using standard 0.4 kg/serving", () => {
      assert.equal(normalizeQuantityToKg(50, "servings"), 20); // 50 * 0.4 = 20
      assert.equal(normalizeQuantityToKg(10, "portions"), 4); // 10 * 0.4 = 4
      assert.equal(normalizeQuantityToKg(25, "meals"), 10); // 25 * 0.4 = 10
    });

    it("normalizes liters/litres assuming density of 1.0 kg/L", () => {
      assert.equal(normalizeQuantityToKg(15, "liters"), 15);
      assert.equal(normalizeQuantityToKg(30, "litres"), 30);
    });

    it("normalizes grams to kg (qty / 1000)", () => {
      assert.equal(normalizeQuantityToKg(5000, "g"), 5);
      assert.equal(normalizeQuantityToKg(2500, "grams"), 2.5);
    });

    it("handles zero and negative input safely", () => {
      assert.equal(normalizeQuantityToKg(0, "kg"), 0);
      assert.equal(normalizeQuantityToKg(-10, "kg"), 0);
    });
  });

  describe("Deterministic Impact Metrics Calculation", () => {
    it("calculates exact metrics for standard 50 kg surplus batch", () => {
      const metrics = calculateImpact(50, "kg");

      // Food Saved: 50 kg
      assert.equal(metrics.foodSavedQuantity, 50);
      // Meals Saved: 50 / 0.4 = 125 meals
      assert.equal(metrics.estimatedMealsSaved, 125);
      // Waste Diverted: 50 kg
      assert.equal(metrics.estimatedWasteDiverted, 50);
      // CO2e Avoided: 50 * 2.5 = 125 kg CO2e
      assert.equal(metrics.estimatedCo2eAvoided, 125);
      // Value Saved: 50 * 60 INR = 3000 INR
      assert.equal(metrics.estimatedValueSaved, 3000);
    });

    it("calculates exact metrics for servings input (100 servings)", () => {
      const metrics = calculateImpact(100, "servings");

      // 100 servings = 40 kg
      assert.equal(metrics.foodSavedQuantity, 40);
      // Meals saved: 40 / 0.4 = 100
      assert.equal(metrics.estimatedMealsSaved, 100);
      // Waste diverted: 40 kg
      assert.equal(metrics.estimatedWasteDiverted, 40);
      // CO2e avoided: 40 * 2.5 = 100 kg CO2e
      assert.equal(metrics.estimatedCo2eAvoided, 100);
      // Value saved: 40 * 60 INR = 2400 INR
      assert.equal(metrics.estimatedValueSaved, 2400);
    });

    it("rounds fractional numbers to 2 decimal places properly", () => {
      const metrics = calculateImpact(33.5, "kg");

      assert.equal(metrics.foodSavedQuantity, 33.5);
      assert.equal(metrics.estimatedMealsSaved, 83.75); // 33.5 / 0.4 = 83.75
      assert.equal(metrics.estimatedWasteDiverted, 33.5);
      assert.equal(metrics.estimatedCo2eAvoided, 83.75); // 33.5 * 2.5 = 83.75
      assert.equal(metrics.estimatedValueSaved, 2010); // 33.5 * 60 = 2010
    });

    it("handles zero quantity gracefully without NaN or negative values", () => {
      const metrics = calculateImpact(0, "kg");

      assert.equal(metrics.foodSavedQuantity, 0);
      assert.equal(metrics.estimatedMealsSaved, 0);
      assert.equal(metrics.estimatedWasteDiverted, 0);
      assert.equal(metrics.estimatedCo2eAvoided, 0);
      assert.equal(metrics.estimatedValueSaved, 0);
    });
  });
});
