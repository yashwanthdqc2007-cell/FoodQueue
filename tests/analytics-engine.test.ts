import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateMealOperations,
  calculateSurplusMetrics,
  calculateImpactMetrics,
  calculatePredictionAccuracy,
  calculateMealPeriodBreakdown,
  generateWasteInsights,
  aggregateTimeSeries,
  MealRecord,
  ConsumptionRecord,
  SurplusRecord,
  ImpactRecord,
  PredictionRecord,
} from "@/lib/analytics/kitchen";
import { resolveDateRange, analyticsQuerySchema } from "@/lib/validation/analytics";
import { normalizeQuantityToKg } from "@/lib/rules/impact-calculator";

describe("Phase 6: Analytics & Impact Intelligence Engine", () => {
  describe("Date Range Query & Boundaries", () => {
    it("resolves default 30d period into 30-day ISO boundary", () => {
      const { startIso, endIso } = resolveDateRange({ period: "30d" });
      assert.ok(startIso);
      assert.ok(endIso);
      const startMs = new Date(startIso).getTime();
      const endMs = new Date(endIso).getTime();
      const diffDays = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
      assert.equal(diffDays, 30);
    });

    it("resolves 7d and 90d periods accurately", () => {
      const range7 = resolveDateRange({ period: "7d" });
      const range90 = resolveDateRange({ period: "90d" });
      assert.ok(range7.startIso);
      assert.ok(range90.startIso);
      const diff7 = Math.round((new Date(range7.endIso).getTime() - new Date(range7.startIso).getTime()) / (24 * 60 * 60 * 1000));
      const diff90 = Math.round((new Date(range90.endIso).getTime() - new Date(range90.startIso).getTime()) / (24 * 60 * 60 * 1000));
      assert.equal(diff7, 7);
      assert.equal(diff90, 90);
    });

    it("handles 'all' period by setting startIso to null", () => {
      const { startIso, endIso } = resolveDateRange({ period: "all" });
      assert.equal(startIso, null);
      assert.ok(endIso);
    });

    it("validates analytics query schema and defaults", () => {
      const valid = analyticsQuerySchema.safeParse({});
      assert.equal(valid.success, true);
      if (valid.success) {
        assert.equal(valid.data.period, "30d");
      }
    });
  });

  describe("Meal Operations & Consumption Audits", () => {
    const mockMeals: MealRecord[] = [
      {
        id: "m-1",
        kitchen_id: "k-1",
        meal_name: "Lunch Service A",
        meal_date: "2026-10-01",
        meal_period: "lunch",
        expected_consumers: 150,
        planned_quantity: 150,
        unit: "servings",
        created_at: "2026-10-01T08:00:00Z",
      },
      {
        id: "m-2",
        kitchen_id: "k-1",
        meal_name: "Dinner Service B",
        meal_date: "2026-10-01",
        meal_period: "dinner",
        expected_consumers: 120,
        planned_quantity: 120,
        unit: "servings",
        created_at: "2026-10-01T15:00:00Z",
      },
      {
        id: "m-3",
        kitchen_id: "k-1",
        meal_name: "Breakfast Service C",
        meal_date: "2026-10-02",
        meal_period: "breakfast",
        expected_consumers: 80,
        planned_quantity: 80,
        unit: "servings",
        created_at: "2026-10-02T06:00:00Z",
      },
    ];

    const mockConsumptions: ConsumptionRecord[] = [
      {
        id: "c-1",
        meal_id: "m-1",
        actual_consumers: 140,
        prepared_quantity: 150,
        consumed_quantity: 135,
        leftover_quantity: 15,
        recorded_at: "2026-10-01T14:00:00Z",
      },
      {
        id: "c-2",
        meal_id: "m-2",
        actual_consumers: 110,
        prepared_quantity: 120,
        consumed_quantity: 105,
        leftover_quantity: 15,
        recorded_at: "2026-10-01T21:00:00Z",
      },
    ];

    it("calculates correct planned vs audited counts and pending audits", () => {
      const ops = calculateMealOperations(mockMeals, mockConsumptions);
      assert.equal(ops.totalMealsPlanned, 3);
      assert.equal(ops.totalMealsAudited, 2);
      assert.equal(ops.mealsAwaitingAudit, 1);
      assert.equal(ops.totalExpectedConsumers, 350); // 150 + 120 + 80
      assert.equal(ops.totalActualConsumers, 250); // 140 + 110
      assert.equal(ops.totalPreparedQuantity, 270); // 150 + 120
      assert.equal(ops.totalRecordedLeftovers, 30); // 15 + 15
      // Leftover Rate: 30 / 270 = 11.11%
      assert.equal(ops.overallLeftoverRate, 11.11);
    });

    it("handles zero prepared quantity safely without division by zero", () => {
      const ops = calculateMealOperations([], []);
      assert.equal(ops.totalMealsPlanned, 0);
      assert.equal(ops.overallLeftoverRate, 0);
    });
  });

  describe("Surplus Metrics & Lifecycle Distribution", () => {
    const mockSurplus: SurplusRecord[] = [
      {
        id: "s-1",
        kitchen_id: "k-1",
        source_meal_id: "m-1",
        food_name: "Rice",
        quantity: 20,
        unit: "kg",
        status: "active",
        category: "edible_surplus",
        reported_at: "2026-10-01T14:30:00Z",
        redistribution_deadline: "2026-10-01T18:00:00Z",
      },
      {
        id: "s-2",
        kitchen_id: "k-1",
        source_meal_id: null,
        food_name: "Curry",
        quantity: 10,
        unit: "kg",
        status: "picked_up",
        category: "edible_surplus",
        reported_at: "2026-10-01T14:30:00Z",
        redistribution_deadline: "2026-10-01T18:00:00Z",
      },
      {
        id: "s-3",
        kitchen_id: "k-1",
        source_meal_id: null,
        food_name: "Vegetable peels",
        quantity: 5,
        unit: "kg",
        status: "recovered",
        category: "organic",
        reported_at: "2026-10-01T14:30:00Z",
        redistribution_deadline: null,
      },
    ];

    it("correctly counts status and category frequencies", () => {
      const metrics = calculateSurplusMetrics(mockSurplus);
      assert.equal(metrics.statusCounts.active, 1);
      assert.equal(metrics.statusCounts.picked_up, 1);
      assert.equal(metrics.statusCounts.recovered, 1);
      assert.equal(metrics.categoryCounts.edible_surplus, 2);
      assert.equal(metrics.categoryCounts.organic, 1);
      assert.equal(metrics.activeSurplusBatches, 1);
      assert.equal(metrics.activeSurplusKg, 20);
    });
  });

  describe("Impact Metrics Aggregation & Deduplication", () => {
    const mockImpact: ImpactRecord[] = [
      {
        id: "imp-1",
        surplus_id: "s-1",
        food_saved_quantity: 25,
        estimated_meals_saved: 62.5,
        estimated_waste_diverted: 25,
        estimated_co2e_avoided: 62.5,
        estimated_value_saved: 1500,
        recorded_at: "2026-10-01T16:00:00Z",
      },
      {
        id: "imp-2",
        surplus_id: "s-2",
        food_saved_quantity: 15,
        estimated_meals_saved: 37.5,
        estimated_waste_diverted: 15,
        estimated_co2e_avoided: 37.5,
        estimated_value_saved: 900,
        recorded_at: "2026-10-02T16:00:00Z",
      },
    ];

    it("aggregates verified impact records accurately", () => {
      const impact = calculateImpactMetrics(mockImpact);
      assert.equal(impact.totalFoodSavedKg, 40);
      assert.equal(impact.estimatedMealsSaved, 100);
      assert.equal(impact.estimatedWasteDivertedKg, 40);
      assert.equal(impact.estimatedCo2eAvoidedKg, 100);
      assert.equal(impact.estimatedValueSavedInr, 2400);
      assert.equal(impact.assumptions.mealEquivalentKg, 0.4);
      assert.equal(impact.assumptions.co2eMultiplierKgPerKg, 2.5);
      assert.equal(impact.assumptions.valuePerKgInr, 60);
    });

    it("handles empty impact record dataset gracefully", () => {
      const impact = calculateImpactMetrics([]);
      assert.equal(impact.totalFoodSavedKg, 0);
      assert.equal(impact.estimatedMealsSaved, 0);
      assert.equal(impact.estimatedValueSavedInr, 0);
    });
  });

  describe("Prediction Performance & Error Metrics", () => {
    const mockMeals: MealRecord[] = [
      {
        id: "m-1",
        kitchen_id: "k-1",
        meal_name: "Lunch",
        meal_date: "2026-10-01",
        meal_period: "lunch",
        expected_consumers: 100,
        planned_quantity: 100,
        unit: "servings",
        created_at: "2026-10-01T08:00:00Z",
      },
      {
        id: "m-2",
        kitchen_id: "k-1",
        meal_name: "Dinner",
        meal_date: "2026-10-01",
        meal_period: "dinner",
        expected_consumers: 80,
        planned_quantity: 80,
        unit: "servings",
        created_at: "2026-10-01T15:00:00Z",
      },
    ];

    const mockConsumptions: ConsumptionRecord[] = [
      {
        id: "c-1",
        meal_id: "m-1",
        actual_consumers: 105,
        prepared_quantity: 110,
        consumed_quantity: 105,
        leftover_quantity: 5,
        recorded_at: "2026-10-01T14:00:00Z",
      },
      {
        id: "c-2",
        meal_id: "m-2",
        actual_consumers: 80,
        prepared_quantity: 85,
        consumed_quantity: 80,
        leftover_quantity: 5,
        recorded_at: "2026-10-01T21:00:00Z",
      },
    ];

    const mockPredictions: PredictionRecord[] = [
      {
        id: "p-1",
        kitchen_id: "k-1",
        prediction_date: "2026-10-01",
        meal_period: "lunch",
        predicted_consumers: 100,
        recommended_quantity: 105,
        predicted_surplus: 5,
        confidence: 0.85,
        model_version: "mvp-baseline-v1",
        created_at: "2026-09-30T18:00:00Z",
      },
      {
        id: "p-2",
        kitchen_id: "k-1",
        prediction_date: "2026-10-01",
        meal_period: "dinner",
        predicted_consumers: 88,
        recommended_quantity: 90,
        predicted_surplus: 2,
        confidence: 0.80,
        model_version: "mvp-baseline-v1",
        created_at: "2026-09-30T18:00:00Z",
      },
    ];

    it("computes MAE and MAPE across eligible prediction vs actual pairs", () => {
      const perf = calculatePredictionAccuracy(mockPredictions, mockMeals, mockConsumptions);
      assert.equal(perf.comparisonsCount, 2);

      // p1: abs(100 - 105) = 5 -> pct = (5 / 105) * 100 = 4.76%
      // p2: abs(88 - 80) = 8 -> pct = (8 / 80) * 100 = 10.00%
      // MAE: (5 + 8) / 2 = 6.5
      // MAPE: (4.76 + 10.00) / 2 = 7.38%
      assert.equal(perf.meanAbsoluteError, 6.5);
      assert.equal(perf.meanAbsolutePercentageError, 7.38);
    });

    it("excludes unmatched predictions cleanly without throwing", () => {
      const unmatchedPreds: PredictionRecord[] = [
        {
          id: "p-99",
          kitchen_id: "k-1",
          prediction_date: "2026-10-99",
          meal_period: "snack",
          predicted_consumers: 50,
          recommended_quantity: 50,
          predicted_surplus: 0,
          confidence: 0.5,
          model_version: "mvp-baseline-v1",
          created_at: "2026-09-30T18:00:00Z",
        },
      ];
      const perf = calculatePredictionAccuracy(unmatchedPreds, mockMeals, mockConsumptions);
      assert.equal(perf.comparisonsCount, 0);
      assert.equal(perf.meanAbsoluteError, 0);
      assert.equal(perf.meanAbsolutePercentageError, null);
    });
  });

  describe("Deterministic Waste Insights Generator", () => {
    it("generates deterministic leftover rate and recovery insights from data", () => {
      const mockMeals: MealRecord[] = [
        {
          id: "m-1",
          kitchen_id: "k-1",
          meal_name: "Dinner Service",
          meal_date: "2026-10-01", // Thursday
          meal_period: "dinner",
          expected_consumers: 100,
          planned_quantity: 100,
          unit: "servings",
          created_at: "2026-10-01T08:00:00Z",
        },
      ];
      const mockConsumptions: ConsumptionRecord[] = [
        {
          id: "c-1",
          meal_id: "m-1",
          actual_consumers: 75,
          prepared_quantity: 100,
          consumed_quantity: 75,
          leftover_quantity: 25, // 25% leftover
          recorded_at: "2026-10-01T21:00:00Z",
        },
      ];
      const mockSurplus: SurplusRecord[] = [
        {
          id: "s-1",
          kitchen_id: "k-1",
          source_meal_id: "m-1",
          food_name: "Biryani",
          quantity: 25,
          unit: "kg",
          status: "picked_up",
          category: "edible_surplus",
          reported_at: "2026-10-01T21:30:00Z",
          redistribution_deadline: "2026-10-02T02:00:00Z",
        },
      ];
      const mockImpact: ImpactRecord[] = [
        {
          id: "imp-1",
          surplus_id: "s-1",
          food_saved_quantity: 25,
          estimated_meals_saved: 62.5,
          estimated_waste_diverted: 25,
          estimated_co2e_avoided: 62.5,
          estimated_value_saved: 1500,
          recorded_at: "2026-10-01T22:00:00Z",
        },
      ];

      const insights = generateWasteInsights(mockMeals, mockConsumptions, mockSurplus, mockImpact);
      assert.ok(insights.length >= 2);

      const periodInsight = insights.find((i) => i.id === "highest-leftover-period");
      assert.ok(periodInsight);
      assert.equal(periodInsight?.metricValue, "25%");

      const recoveryInsight = insights.find((i) => i.id === "redistribution-recovery-rate");
      assert.ok(recoveryInsight);
      assert.equal(recoveryInsight?.metricValue, "100%");
    });
  });

  describe("Time Series Aggregations", () => {
    it("aggregates daily series correctly with matching dates", () => {
      const mockMeals: MealRecord[] = [
        {
          id: "m-1",
          kitchen_id: "k-1",
          meal_name: "Lunch",
          meal_date: "2026-10-05",
          meal_period: "lunch",
          expected_consumers: 100,
          planned_quantity: 100,
          unit: "servings",
          created_at: "2026-10-05T08:00:00Z",
        },
      ];
      const mockConsumptions: ConsumptionRecord[] = [
        {
          id: "c-1",
          meal_id: "m-1",
          actual_consumers: 90,
          prepared_quantity: 100,
          consumed_quantity: 90,
          leftover_quantity: 10,
          recorded_at: "2026-10-05T14:00:00Z",
        },
      ];

      const series = aggregateTimeSeries(mockMeals, mockConsumptions, [], [], []);
      assert.equal(series.length, 1);
      assert.equal(series[0].date, "2026-10-05");
      assert.equal(series[0].preparedQuantity, 100);
      assert.equal(series[0].consumedQuantity, 90);
      assert.equal(series[0].leftoverQuantity, 10);
      assert.equal(series[0].actualConsumers, 90);
    });
  });
});
