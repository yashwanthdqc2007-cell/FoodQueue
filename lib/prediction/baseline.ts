export interface HistoricalRecord {
  mealDate: string;
  actualConsumers: number;
  preparedQuantity: number;
  unit: string;
}

export interface PredictionInput {
  targetDate: string;
  targetUnit: string;
  expectedConsumers?: number;
  baselinePortionRatio?: number;
  historicalRecords: HistoricalRecord[];
}

export type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW" | "COLD_START";

export interface DemandPredictionResult {
  predictedConsumers: number;
  portionRatio: number;
  recommendedQuantity: number;
  predictedSurplus: number;
  confidence: number;
  confidenceTier: ConfidenceTier;
  breakdown: {
    weekdayAverage: number | null;
    sevenDayAverage: number | null;
    periodAverage: number | null;
    weekdaySampleCount: number;
    sevenDaySampleCount: number;
    periodSampleCount: number;
  };
  modelVersion: string;
}

/**
 * Calculates date difference in whole days between two ISO date strings (targetDate - recordDate).
 */
function getDaysDifference(targetDateStr: string, recordDateStr: string): number {
  const target = new Date(targetDateStr.slice(0, 10) + "T00:00:00Z");
  const record = new Date(recordDateStr.slice(0, 10) + "T00:00:00Z");
  const diffMs = target.getTime() - record.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Gets day of week (0 = Sunday, 6 = Saturday) in UTC from ISO date string.
 */
function getUtcDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr.slice(0, 10) + "T00:00:00Z");
  return d.getUTCDay();
}

/**
 * Deterministic baseline demand prediction engine (`mvp-baseline-v1`).
 */
export function computeDemandPrediction(input: PredictionInput): DemandPredictionResult {
  const targetDayOfWeek = getUtcDayOfWeek(input.targetDate);

  // 1. Filter valid historical records in the 28-day lookback window [T-28, T-1]
  const validRecords = input.historicalRecords.filter((r) => {
    const daysDiff = getDaysDifference(input.targetDate, r.mealDate);
    return daysDiff >= 1 && daysDiff <= 28 && r.actualConsumers > 0 && r.preparedQuantity >= 0;
  });

  // 2. Filter Window A (Same-weekday) and Window B (Recent 7-day)
  const weekdayRecords = validRecords.filter((r) => getUtcDayOfWeek(r.mealDate) === targetDayOfWeek);
  const sevenDayRecords = validRecords.filter((r) => {
    const daysDiff = getDaysDifference(input.targetDate, r.mealDate);
    return daysDiff >= 1 && daysDiff <= 7;
  });

  const nWeekday = weekdayRecords.length;
  const n7Day = sevenDayRecords.length;
  const nPeriod = validRecords.length;

  const avgWeekday = nWeekday > 0 ? weekdayRecords.reduce((sum, r) => sum + r.actualConsumers, 0) / nWeekday : null;
  const avg7Day = n7Day > 0 ? sevenDayRecords.reduce((sum, r) => sum + r.actualConsumers, 0) / n7Day : null;
  const avgPeriod = nPeriod > 0 ? validRecords.reduce((sum, r) => sum + r.actualConsumers, 0) / nPeriod : null;

  // 3. Dynamic Weight Normalization
  let totalWeight = 0;
  if (avgWeekday !== null) totalWeight += 0.50;
  if (avg7Day !== null) totalWeight += 0.30;
  if (avgPeriod !== null) totalWeight += 0.20;

  let predictedConsumers = input.expectedConsumers !== undefined && input.expectedConsumers >= 0
    ? input.expectedConsumers
    : 100;
  let confidence = 0.20;

  if (totalWeight > 0) {
    let weightedSum = 0;
    if (avgWeekday !== null) weightedSum += (0.50 / totalWeight) * avgWeekday;
    if (avg7Day !== null) weightedSum += (0.30 / totalWeight) * avg7Day;
    if (avgPeriod !== null) weightedSum += (0.20 / totalWeight) * avgPeriod;

    predictedConsumers = Math.round(weightedSum);

    const rawConfidence =
      0.20 +
      0.30 * Math.min(1, nWeekday / 4) +
      0.25 * Math.min(1, n7Day / 7) +
      0.20 * Math.min(1, nPeriod / 20);

    // Bound strictly within [0.20, 0.95]
    confidence = Math.min(0.95, Math.max(0.20, Number(rawConfidence.toFixed(4))));
  }

  // 4. Portion Ratio Resolution with Unit Isolation
  let portionRatio: number;
  const targetUnitLower = input.targetUnit.trim().toLowerCase();
  const sameUnitRecords = validRecords.filter(
    (r) => r.unit.trim().toLowerCase() === targetUnitLower
  );

  if (sameUnitRecords.length > 0) {
    const perRecordRatios = sameUnitRecords.map((r) => r.preparedQuantity / r.actualConsumers);
    portionRatio = perRecordRatios.reduce((a, b) => a + b, 0) / perRecordRatios.length;
  } else if (input.baselinePortionRatio && input.baselinePortionRatio > 0) {
    portionRatio = input.baselinePortionRatio;
  } else {
    // Deterministic Unit Defaults
    switch (targetUnitLower) {
      case "servings":
        portionRatio = 1.0;
        break;
      case "kg":
        portionRatio = 0.40;
        break;
      case "litres":
      case "l":
      case "liter":
      case "liters":
        portionRatio = 0.35;
        break;
      default:
        portionRatio = 1.0;
        break;
    }
  }

  portionRatio = Math.round(portionRatio * 1000) / 1000;

  // 5. Recommended Preparation Quantity (with 3% safety buffer)
  const exactRecommended = predictedConsumers * portionRatio * 1.03;
  const recommendedQuantity = Math.round(exactRecommended * 100) / 100;

  // 6. Modeled Preparation Buffer Surplus
  const exactExpectedDemand = predictedConsumers * portionRatio;
  const predictedSurplus = Math.max(0, Math.round((recommendedQuantity - exactExpectedDemand) * 100) / 100);

  // 7. Confidence Tier Categorization
  let confidenceTier: ConfidenceTier = "COLD_START";
  if (nPeriod === 0) {
    confidenceTier = "COLD_START";
  } else if (confidence >= 0.80) {
    confidenceTier = "HIGH";
  } else if (confidence >= 0.50) {
    confidenceTier = "MEDIUM";
  } else {
    confidenceTier = "LOW";
  }

  return {
    predictedConsumers,
    portionRatio,
    recommendedQuantity,
    predictedSurplus,
    confidence,
    confidenceTier,
    breakdown: {
      weekdayAverage: avgWeekday !== null ? Math.round(avgWeekday * 100) / 100 : null,
      sevenDayAverage: avg7Day !== null ? Math.round(avg7Day * 100) / 100 : null,
      periodAverage: avgPeriod !== null ? Math.round(avgPeriod * 100) / 100 : null,
      weekdaySampleCount: nWeekday,
      sevenDaySampleCount: n7Day,
      periodSampleCount: nPeriod,
    },
    modelVersion: "mvp-baseline-v1",
  };
}
