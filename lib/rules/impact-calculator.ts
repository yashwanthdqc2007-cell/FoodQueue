/**
 * Impact Calculator
 *
 * Implements deterministic impact calculation formulas from DATABASE_RULES.md (Section 6.5):
 * - Food Saved (kg) = Surplus Quantity (normalized to kg)
 * - Estimated Meals Saved = Food Saved (kg) / 0.4 kg per meal
 * - Estimated Waste Diverted (kg) = Food Saved (kg)
 * - Estimated CO2e Avoided (kg) = Food Saved (kg) * 2.5 kg CO2e / kg food
 * - Estimated Value Saved (INR) = Food Saved (kg) * 60 INR / kg
 */

export interface ImpactCalculationInput {
  quantity: number;
  unit: string;
}

export interface ImpactMetrics {
  foodSavedQuantity: number;
  estimatedMealsSaved: number;
  estimatedWasteDiverted: number;
  estimatedCo2eAvoided: number;
  estimatedValueSaved: number;
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Normalizes input quantity into kilograms based on standard unit assumptions:
 * - 'kg' / 'kilograms': 1.0
 * - 'servings' / 'portions' / 'meals': 0.4 kg / serving
 * - 'liters' / 'litres' / 'l': 1.0 kg / L (approx density 1.0)
 * - 'g' / 'grams': 0.001 kg / g
 */
export function normalizeQuantityToKg(quantity: number, unit: string = "kg"): number {
  const rawQuantity = Math.max(0, Number(quantity) || 0);
  const unitNormalized = (unit || "kg").toLowerCase().trim();

  if (unitNormalized === "servings" || unitNormalized === "portions" || unitNormalized === "meals") {
    return round2(rawQuantity * 0.4);
  }
  if (unitNormalized === "g" || unitNormalized === "grams") {
    return round2(rawQuantity / 1000);
  }
  // Default to 1.0 ratio for kg, liters, litres, etc.
  return round2(rawQuantity);
}

export function calculateImpact(quantity: number, unit: string = "kg"): ImpactMetrics {
  const foodSavedQuantity = normalizeQuantityToKg(quantity, unit);
  const estimatedMealsSaved = foodSavedQuantity > 0 ? round2(foodSavedQuantity / 0.4) : 0;
  const estimatedWasteDiverted = foodSavedQuantity;
  const estimatedCo2eAvoided = round2(foodSavedQuantity * 2.5);
  const estimatedValueSaved = round2(foodSavedQuantity * 60);

  return {
    foodSavedQuantity,
    estimatedMealsSaved,
    estimatedWasteDiverted,
    estimatedCo2eAvoided,
    estimatedValueSaved,
  };
}

export function calculateRedistributionImpact(input: ImpactCalculationInput): ImpactMetrics {
  return calculateImpact(input.quantity, input.unit);
}
