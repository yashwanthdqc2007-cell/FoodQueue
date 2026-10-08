import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeDemandPrediction,
  type HistoricalRecord,
  type PredictionInput,
} from "../lib/prediction/baseline";

describe("Deterministic Demand Prediction Engine (mvp-baseline-v1)", () => {
  const targetDate = "2026-10-14"; // A Wednesday (UTC day 3)
  const targetUnit = "servings";

  // Helper to generate a date offset string
  function getPriorDate(daysAgo: number): string {
    const d = new Date(new Date(targetDate + "T00:00:00Z").getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }

  it("1. Normal History: calculates exact 50/30/20 weighted arithmetic and high confidence", () => {
    // Generate 28 daily records
    const records: HistoricalRecord[] = [];
    for (let i = 1; i <= 28; i++) {
      const isWednesday = i % 7 === 0;
      records.push({
        mealDate: getPriorDate(i),
        actualConsumers: isWednesday ? 820 : 800,
        preparedQuantity: isWednesday ? 861 : 840, // portion ratio = 1.05
        unit: "servings",
      });
    }

    const input: PredictionInput = {
      targetDate,
      targetUnit,
      historicalRecords: records,
    };

    const result = computeDemandPrediction(input);

    assert.equal(result.breakdown.weekdaySampleCount, 4);
    assert.equal(result.breakdown.sevenDaySampleCount, 7);
    assert.equal(result.breakdown.periodSampleCount, 28);

    // Weekday avg: (820*4)/4 = 820
    // 7-day avg: 6 days of 800, 1 day of 820 -> (4800 + 820)/7 = 5620/7 = 802.857
    // Period avg: 24 days of 800, 4 days of 820 -> (19200 + 3280)/28 = 22480/28 = 802.857
    // Weighted consumers: (0.50 * 820) + (0.30 * 802.857) + (0.20 * 802.857) = 410 + 240.857 + 160.571 = 811.428 -> 811
    assert.equal(result.predictedConsumers, 811);
    assert.equal(result.portionRatio, 1.05);

    // Recommended quantity = round(811 * 1.05 * 1.03, 2) = round(877.0965, 2) = 877.1
    assert.equal(result.recommendedQuantity, 877.1);

    // Predicted surplus = round(877.1 - (811 * 1.05), 2) = round(877.1 - 851.55, 2) = 25.55
    assert.equal(result.predictedSurplus, 25.55);

    // Confidence: 0.20 + 0.30(4/4) + 0.25(7/7) + 0.20(20/20) = 0.95
    assert.equal(result.confidence, 0.95);
    assert.equal(result.confidenceTier, "HIGH");
  });

  it("2. Missing Weekday Samples: normalizes dynamic weights to 60% 7-day and 40% period", () => {
    // Records on days 1, 2, 3 (none of which are Wednesday)
    const records: HistoricalRecord[] = [
      { mealDate: getPriorDate(1), actualConsumers: 600, preparedQuantity: 600, unit: "servings" },
      { mealDate: getPriorDate(2), actualConsumers: 700, preparedQuantity: 700, unit: "servings" },
    ];

    const input: PredictionInput = {
      targetDate,
      targetUnit,
      historicalRecords: records,
    };

    const result = computeDemandPrediction(input);

    assert.equal(result.breakdown.weekdaySampleCount, 0);
    assert.equal(result.breakdown.sevenDaySampleCount, 2);
    assert.equal(result.breakdown.periodSampleCount, 2);

    // 7-day avg = 650, Period avg = 650
    // Dynamic weights: w_7day = 0.30/0.50 = 0.60, w_period = 0.20/0.50 = 0.40
    // Weighted = (0.60 * 650) + (0.40 * 650) = 650
    assert.equal(result.predictedConsumers, 650);
    assert.equal(result.confidenceTier, "LOW");
  });

  it("3. Missing 7-day Samples: normalizes dynamic weights between weekday and period", () => {
    // Records on day 14 and 21 (prior Wednesdays outside 7-day window)
    const records: HistoricalRecord[] = [
      { mealDate: getPriorDate(14), actualConsumers: 900, preparedQuantity: 900, unit: "servings" },
      { mealDate: getPriorDate(21), actualConsumers: 920, preparedQuantity: 920, unit: "servings" },
    ];

    const input: PredictionInput = {
      targetDate,
      targetUnit,
      historicalRecords: records,
    };

    const result = computeDemandPrediction(input);

    assert.equal(result.breakdown.weekdaySampleCount, 2);
    assert.equal(result.breakdown.sevenDaySampleCount, 0);
    assert.equal(result.breakdown.periodSampleCount, 2);

    // Weekday avg = 910, Period avg = 910
    assert.equal(result.predictedConsumers, 910);
    assert.ok(result.confidence > 0.20);
  });

  it("4. Cold Start (Zero History): falls back to expected consumers or 100 with confidence 0.20", () => {
    const inputWithExpected: PredictionInput = {
      targetDate,
      targetUnit: "servings",
      expectedConsumers: 450,
      historicalRecords: [],
    };

    const result = computeDemandPrediction(inputWithExpected);

    assert.equal(result.predictedConsumers, 450);
    assert.equal(result.confidence, 0.20);
    assert.equal(result.confidenceTier, "COLD_START");
    assert.equal(result.portionRatio, 1.0);
    assert.equal(result.recommendedQuantity, Math.round(450 * 1.0 * 1.03 * 100) / 100);

    const inputEmpty: PredictionInput = {
      targetDate,
      targetUnit: "servings",
      historicalRecords: [],
    };
    const defaultResult = computeDemandPrediction(inputEmpty);
    assert.equal(defaultResult.predictedConsumers, 100);
    assert.equal(defaultResult.confidenceTier, "COLD_START");
  });

  it("5. Portion-Ratio Fallback: handles standard unit defaults and baselinePortionRatio", () => {
    // Test 'kg' unit default
    const kgResult = computeDemandPrediction({
      targetDate,
      targetUnit: "kg",
      expectedConsumers: 200,
      historicalRecords: [],
    });
    assert.equal(kgResult.portionRatio, 0.40);
    assert.equal(kgResult.recommendedQuantity, Math.round(200 * 0.40 * 1.03 * 100) / 100);

    // Test 'litres' unit default
    const lResult = computeDemandPrediction({
      targetDate,
      targetUnit: "litres",
      expectedConsumers: 100,
      historicalRecords: [],
    });
    assert.equal(lResult.portionRatio, 0.35);

    // Test explicit baselinePortionRatio override
    const customResult = computeDemandPrediction({
      targetDate,
      targetUnit: "trays",
      expectedConsumers: 100,
      baselinePortionRatio: 0.15,
      historicalRecords: [],
    });
    assert.equal(customResult.portionRatio, 0.15);
    assert.equal(customResult.recommendedQuantity, Math.round(100 * 0.15 * 1.03 * 100) / 100);
  });

  it("6. Exclusion of actual_consumers = 0 records", () => {
    const records: HistoricalRecord[] = [
      { mealDate: getPriorDate(1), actualConsumers: 0, preparedQuantity: 500, unit: "servings" },
      { mealDate: getPriorDate(2), actualConsumers: 500, preparedQuantity: 500, unit: "servings" },
    ];

    const result = computeDemandPrediction({
      targetDate,
      targetUnit,
      historicalRecords: records,
    });

    assert.equal(result.breakdown.periodSampleCount, 1);
    assert.equal(result.predictedConsumers, 500);
  });

  it("7. Mixed Measurement Units: respects unit isolation during portion ratio calculation", () => {
    const records: HistoricalRecord[] = [
      // 2 records in kg
      { mealDate: getPriorDate(1), actualConsumers: 100, preparedQuantity: 40, unit: "kg" },
      { mealDate: getPriorDate(2), actualConsumers: 100, preparedQuantity: 42, unit: "kg" },
      // 1 record in servings
      { mealDate: getPriorDate(3), actualConsumers: 100, preparedQuantity: 100, unit: "servings" },
    ];

    const kgResult = computeDemandPrediction({
      targetDate,
      targetUnit: "kg",
      historicalRecords: records,
    });

    // Ratio should only average the 2 kg records: (40/100 + 42/100) / 2 = 0.41
    assert.equal(kgResult.portionRatio, 0.41);
  });

  it("8. Confidence Bounds: strictly clamps between [0.20, 0.95]", () => {
    // 0 samples
    const cold = computeDemandPrediction({ targetDate, targetUnit, historicalRecords: [] });
    assert.equal(cold.confidence, 0.20);

    // Over-saturated samples (e.g. 50 samples)
    const records: HistoricalRecord[] = [];
    for (let i = 1; i <= 28; i++) {
      records.push({ mealDate: getPriorDate(i), actualConsumers: 500, preparedQuantity: 500, unit: "servings" });
    }
    const saturated = computeDemandPrediction({ targetDate, targetUnit, historicalRecords: records });
    assert.ok(saturated.confidence <= 0.95);
    assert.ok(saturated.confidence >= 0.20);
  });
});
