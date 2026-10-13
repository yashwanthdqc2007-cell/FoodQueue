import { SupabaseClient } from "@supabase/supabase-js";
import { normalizeQuantityToKg } from "@/lib/rules/impact-calculator";

export interface MealRecord {
  id: string;
  kitchen_id: string;
  meal_name: string;
  meal_date: string;
  meal_period: "breakfast" | "lunch" | "dinner" | "snack" | "other";
  expected_consumers: number;
  planned_quantity: number;
  unit: string;
  created_at: string;
}

export interface ConsumptionRecord {
  id: string;
  meal_id: string;
  actual_consumers: number;
  prepared_quantity: number;
  consumed_quantity: number;
  leftover_quantity: number;
  recorded_at: string;
}

export interface SurplusRecord {
  id: string;
  kitchen_id: string;
  source_meal_id: string | null;
  food_name: string;
  quantity: number;
  unit: string;
  status: "active" | "matched" | "pickup_pending" | "picked_up" | "expired" | "recovered" | "disposed";
  category: "edible_surplus" | "reusable" | "organic" | "unsafe" | "unknown";
  reported_at: string;
  redistribution_deadline: string | null;
}

export interface ImpactRecord {
  id: string;
  surplus_id: string;
  food_saved_quantity: number;
  estimated_meals_saved: number;
  estimated_waste_diverted: number;
  estimated_co2e_avoided: number | null;
  estimated_value_saved: number | null;
  recorded_at: string;
}

export interface PredictionRecord {
  id: string;
  kitchen_id: string;
  prediction_date: string;
  meal_period: string;
  predicted_consumers: number;
  recommended_quantity: number;
  predicted_surplus: number;
  confidence: number | null;
  model_version: string;
  created_at: string;
}

export interface PredictionComparison {
  date: string;
  mealPeriod: string;
  predictedConsumers: number;
  actualConsumers: number;
  absoluteError: number;
  percentageError: number | null;
}

export interface WasteInsight {
  id: string;
  type: "positive" | "warning" | "neutral";
  title: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  calculationBasis: string;
}

export interface KitchenAnalyticsSummary {
  period: string;
  dateRange: {
    start: string | null;
    end: string;
  };
  overview: {
    totalMealsPlanned: number;
    totalMealsAudited: number;
    mealsAwaitingAudit: number;
    totalExpectedConsumers: number;
    totalActualConsumers: number;
    totalPreparedQuantity: number;
    totalConsumedQuantity: number;
    totalRecordedLeftovers: number;
    overallLeftoverRate: number; // percentage [0, 100]
    totalActiveSurplusBatches: number;
    totalActiveSurplusKg: number;
    totalCompletedPickups: number;
  };
  impact: {
    totalFoodSavedKg: number;
    estimatedMealsSaved: number;
    estimatedWasteDivertedKg: number;
    estimatedCo2eAvoidedKg: number;
    estimatedValueSavedInr: number;
    assumptions: {
      mealEquivalentKg: number;
      co2eMultiplierKgPerKg: number;
      valuePerKgInr: number;
    };
  };
  surplusStatusCounts: Record<string, number>;
  surplusCategoryCounts: Record<string, number>;
  predictionPerformance: {
    comparisonsCount: number;
    validPercentageObservationsCount: number;
    meanAbsoluteError: number;
    meanAbsolutePercentageError: number | null;
    comparisons: PredictionComparison[];
  };
  timeSeries: Array<{
    date: string;
    plannedMeals: number;
    preparedQuantity: number;
    consumedQuantity: number;
    leftoverQuantity: number;
    foodSavedKg: number;
    predictedConsumers: number | null;
    actualConsumers: number | null;
  }>;
  mealPeriodBreakdown: Array<{
    period: string;
    mealCount: number;
    preparedQuantity: number;
    consumedQuantity: number;
    leftoverQuantity: number;
    leftoverRate: number;
  }>;
  insights: WasteInsight[];
}

/**
 * Pure helper: calculates meal operations and consumption audit metrics.
 */
export function calculateMealOperations(
  meals: MealRecord[],
  consumptions: ConsumptionRecord[]
) {
  const consumptionMap = new Map<string, ConsumptionRecord>();
  for (const c of consumptions) {
    consumptionMap.set(c.meal_id, c);
  }

  let totalExpectedConsumers = 0;
  let totalActualConsumers = 0;
  let totalPreparedQuantity = 0;
  let totalConsumedQuantity = 0;
  let totalRecordedLeftovers = 0;
  let auditedCount = 0;

  for (const m of meals) {
    totalExpectedConsumers += Number(m.expected_consumers) || 0;
    const c = consumptionMap.get(m.id);
    if (c) {
      auditedCount += 1;
      totalActualConsumers += Number(c.actual_consumers) || 0;
      totalPreparedQuantity += Number(c.prepared_quantity) || 0;
      totalConsumedQuantity += Number(c.consumed_quantity) || 0;
      totalRecordedLeftovers += Number(c.leftover_quantity) || 0;
    }
  }

  const overallLeftoverRate =
    totalPreparedQuantity > 0
      ? Math.round((totalRecordedLeftovers / totalPreparedQuantity) * 10000) / 100
      : 0;

  return {
    totalMealsPlanned: meals.length,
    totalMealsAudited: auditedCount,
    mealsAwaitingAudit: Math.max(0, meals.length - auditedCount),
    totalExpectedConsumers,
    totalActualConsumers,
    totalPreparedQuantity: Math.round(totalPreparedQuantity * 100) / 100,
    totalConsumedQuantity: Math.round(totalConsumedQuantity * 100) / 100,
    totalRecordedLeftovers: Math.round(totalRecordedLeftovers * 100) / 100,
    overallLeftoverRate,
  };
}

/**
 * Pure helper: aggregates surplus statuses and categories.
 */
export function calculateSurplusMetrics(surplusItems: SurplusRecord[]) {
  const statusCounts: Record<string, number> = {
    active: 0,
    matched: 0,
    pickup_pending: 0,
    picked_up: 0,
    expired: 0,
    recovered: 0,
    disposed: 0,
  };

  const categoryCounts: Record<string, number> = {
    edible_surplus: 0,
    reusable: 0,
    organic: 0,
    unsafe: 0,
    unknown: 0,
  };

  let activeSurplusBatches = 0;
  let activeSurplusKg = 0;

  for (const s of surplusItems) {
    if (statusCounts[s.status] !== undefined) {
      statusCounts[s.status] += 1;
    }
    if (categoryCounts[s.category] !== undefined) {
      categoryCounts[s.category] += 1;
    }

    if (s.status === "active") {
      activeSurplusBatches += 1;
      activeSurplusKg += normalizeQuantityToKg(s.quantity, s.unit);
    }
  }

  return {
    statusCounts,
    categoryCounts,
    activeSurplusBatches,
    activeSurplusKg: Math.round(activeSurplusKg * 100) / 100,
  };
}

/**
 * Pure helper: aggregates impact records without double counting.
 */
export function calculateImpactMetrics(impactRecords: ImpactRecord[]) {
  let totalFoodSavedKg = 0;
  let estimatedMealsSaved = 0;
  let estimatedWasteDivertedKg = 0;
  let estimatedCo2eAvoidedKg = 0;
  let estimatedValueSavedInr = 0;

  for (const r of impactRecords) {
    const foodSaved = Number(r.food_saved_quantity) || 0;
    totalFoodSavedKg += foodSaved;
    estimatedMealsSaved += Number(r.estimated_meals_saved) || (foodSaved / 0.4);
    estimatedWasteDivertedKg += Number(r.estimated_waste_diverted) || foodSaved;
    estimatedCo2eAvoidedKg += Number(r.estimated_co2e_avoided) || (foodSaved * 2.5);
    estimatedValueSavedInr += Number(r.estimated_value_saved) || (foodSaved * 60);
  }

  return {
    totalFoodSavedKg: Math.round(totalFoodSavedKg * 100) / 100,
    estimatedMealsSaved: Math.round(estimatedMealsSaved * 100) / 100,
    estimatedWasteDivertedKg: Math.round(estimatedWasteDivertedKg * 100) / 100,
    estimatedCo2eAvoidedKg: Math.round(estimatedCo2eAvoidedKg * 100) / 100,
    estimatedValueSavedInr: Math.round(estimatedValueSavedInr * 100) / 100,
    assumptions: {
      mealEquivalentKg: 0.4,
      co2eMultiplierKgPerKg: 2.5,
      valuePerKgInr: 60,
    },
  };
}

/**
 * Pure helper: evaluates demand prediction accuracy against audited meal consumption records.
 */
export function calculatePredictionAccuracy(
  predictions: PredictionRecord[],
  meals: MealRecord[],
  consumptions: ConsumptionRecord[]
) {
  const mealMap = new Map<string, MealRecord>();
  for (const m of meals) {
    mealMap.set(m.id, m);
  }

  const consumptionMap = new Map<string, ConsumptionRecord>();
  for (const c of consumptions) {
    consumptionMap.set(c.meal_id, c);
  }

  // Key by date + period for matching predictions to meals
  const auditedMealsByDateAndPeriod = new Map<string, ConsumptionRecord>();
  for (const m of meals) {
    const c = consumptionMap.get(m.id);
    if (c) {
      const key = `${m.meal_date}_${m.meal_period}`;
      auditedMealsByDateAndPeriod.set(key, c);
    }
  }

  const comparisons: PredictionComparison[] = [];
  let totalAbsoluteError = 0;
  let totalPercentageError = 0;
  let validPercentageCount = 0;

  for (const p of predictions) {
    const key = `${p.prediction_date}_${p.meal_period}`;
    const audited = auditedMealsByDateAndPeriod.get(key);
    if (audited) {
      const actual = Number(audited.actual_consumers) || 0;
      const predicted = Number(p.predicted_consumers) || 0;
      const absErr = Math.abs(predicted - actual);

      let pctErr: number | null = null;
      if (actual > 0) {
        pctErr = Math.round((absErr / actual) * 10000) / 100;
        totalPercentageError += pctErr;
        validPercentageCount += 1;
      }

      totalAbsoluteError += absErr;
      comparisons.push({
        date: p.prediction_date,
        mealPeriod: p.meal_period,
        predictedConsumers: predicted,
        actualConsumers: actual,
        absoluteError: absErr,
        percentageError: pctErr,
      });
    }
  }

  const meanAbsoluteError =
    comparisons.length > 0
      ? Math.round((totalAbsoluteError / comparisons.length) * 100) / 100
      : 0;

  const meanAbsolutePercentageError =
    validPercentageCount > 0
      ? Math.round((totalPercentageError / validPercentageCount) * 100) / 100
      : null;

  return {
    comparisonsCount: comparisons.length,
    validPercentageObservationsCount: validPercentageCount,
    meanAbsoluteError,
    meanAbsolutePercentageError,
    comparisons,
  };
}

/**
 * Pure helper: aggregates meal periods and computes leftover rate per period.
 */
export function calculateMealPeriodBreakdown(
  meals: MealRecord[],
  consumptions: ConsumptionRecord[]
) {
  const consumptionMap = new Map<string, ConsumptionRecord>();
  for (const c of consumptions) {
    consumptionMap.set(c.meal_id, c);
  }

  const periodStats: Record<
    string,
    { mealCount: number; prepared: number; consumed: number; leftovers: number }
  > = {
    breakfast: { mealCount: 0, prepared: 0, consumed: 0, leftovers: 0 },
    lunch: { mealCount: 0, prepared: 0, consumed: 0, leftovers: 0 },
    dinner: { mealCount: 0, prepared: 0, consumed: 0, leftovers: 0 },
    snack: { mealCount: 0, prepared: 0, consumed: 0, leftovers: 0 },
    other: { mealCount: 0, prepared: 0, consumed: 0, leftovers: 0 },
  };

  for (const m of meals) {
    const period = periodStats[m.meal_period] ? m.meal_period : "other";
    periodStats[period].mealCount += 1;

    const c = consumptionMap.get(m.id);
    if (c) {
      periodStats[period].prepared += Number(c.prepared_quantity) || 0;
      periodStats[period].consumed += Number(c.consumed_quantity) || 0;
      periodStats[period].leftovers += Number(c.leftover_quantity) || 0;
    }
  }

  return Object.entries(periodStats)
    .filter(([_, stats]) => stats.mealCount > 0)
    .map(([period, stats]) => {
      const rate =
        stats.prepared > 0
          ? Math.round((stats.leftovers / stats.prepared) * 10000) / 100
          : 0;
      return {
        period,
        mealCount: stats.mealCount,
        preparedQuantity: Math.round(stats.prepared * 100) / 100,
        consumedQuantity: Math.round(stats.consumed * 100) / 100,
        leftoverQuantity: Math.round(stats.leftovers * 100) / 100,
        leftoverRate: rate,
      };
    });
}

/**
 * Pure helper: generates deterministic data-driven waste insights.
 */
export function generateWasteInsights(
  meals: MealRecord[],
  consumptions: ConsumptionRecord[],
  surplusItems: SurplusRecord[],
  impactRecords: ImpactRecord[]
): WasteInsight[] {
  const insights: WasteInsight[] = [];
  const consumptionMap = new Map<string, ConsumptionRecord>();
  for (const c of consumptions) {
    consumptionMap.set(c.meal_id, c);
  }

  // 1. Meal period with highest leftover rate
  const periods = calculateMealPeriodBreakdown(meals, consumptions);
  if (periods.length > 0) {
    const sortedByRate = [...periods].sort((a, b) => b.leftoverRate - a.leftoverRate);
    const highestPeriod = sortedByRate[0];
    if (highestPeriod && highestPeriod.leftoverRate > 0) {
      insights.push({
        id: "highest-leftover-period",
        type: highestPeriod.leftoverRate > 15 ? "warning" : "neutral",
        title: `Highest Leftover Rate: ${highestPeriod.period.toUpperCase()}`,
        description: `${highestPeriod.period.charAt(0).toUpperCase() + highestPeriod.period.slice(1)} services have an average leftover rate of ${highestPeriod.leftoverRate}%, yielding ${highestPeriod.leftoverQuantity} units across ${highestPeriod.mealCount} audited meals.`,
        metricLabel: "Period Leftover Rate",
        metricValue: `${highestPeriod.leftoverRate}%`,
        calculationBasis: "Recorded Leftover Quantity ÷ Prepared Quantity for audited meals in this period",
      });
    }
  }

  // 2. Redistribution Recovery Efficiency
  let totalSurplusKg = 0;
  for (const s of surplusItems) {
    totalSurplusKg += normalizeQuantityToKg(s.quantity, s.unit);
  }
  let totalSavedKg = 0;
  for (const imp of impactRecords) {
    totalSavedKg += Number(imp.food_saved_quantity) || 0;
  }

  if (totalSurplusKg > 0) {
    const recoveryRate = Math.min(100, Math.round((totalSavedKg / totalSurplusKg) * 10000) / 100);
    insights.push({
      id: "redistribution-recovery-rate",
      type: recoveryRate >= 70 ? "positive" : "warning",
      title: "Surplus Redistribution Recovery Rate",
      description: `${recoveryRate}% of declared surplus food (${Math.round(totalSavedKg)} kg of ${Math.round(totalSurplusKg)} kg) was successfully collected by community receivers.`,
      metricLabel: "Recovery Rate",
      metricValue: `${recoveryRate}%`,
      calculationBasis: "Verified Picked-Up Impact Kg ÷ Total Declared Surplus Kg in period",
    });
  }

  // 3. Day of week leftover pattern
  const dayStats: Record<number, { count: number; leftovers: number }> = {
    0: { count: 0, leftovers: 0 },
    1: { count: 0, leftovers: 0 },
    2: { count: 0, leftovers: 0 },
    3: { count: 0, leftovers: 0 },
    4: { count: 0, leftovers: 0 },
    5: { count: 0, leftovers: 0 },
    6: { count: 0, leftovers: 0 },
  };
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  for (const m of meals) {
    const c = consumptionMap.get(m.id);
    if (c) {
      const date = new Date(m.meal_date);
      const dayIndex = date.getDay();
      dayStats[dayIndex].count += 1;
      dayStats[dayIndex].leftovers += Number(c.leftover_quantity) || 0;
    }
  }

  const daysWithAudits = Object.entries(dayStats)
    .filter(([_, s]) => s.count > 0)
    .map(([dayIdx, s]) => ({
      dayName: dayNames[Number(dayIdx)],
      avgLeftovers: Math.round((s.leftovers / s.count) * 100) / 100,
      totalMeals: s.count,
    }))
    .sort((a, b) => b.avgLeftovers - a.avgLeftovers);

  if (daysWithAudits.length > 0 && daysWithAudits[0].avgLeftovers > 0) {
    const topDay = daysWithAudits[0];
    insights.push({
      id: "highest-leftover-day",
      type: "neutral",
      title: `Highest Leftover Day: ${topDay.dayName}`,
      description: `${topDay.dayName} meal services recorded the highest average leftovers (${topDay.avgLeftovers} units/meal over ${topDay.totalMeals} audited services).`,
      metricLabel: "Avg Leftovers / Meal",
      metricValue: `${topDay.avgLeftovers}`,
      calculationBasis: "Total Leftovers on this weekday ÷ Number of audited meals on this weekday",
    });
  }

  // Fallback insight if dataset is empty or clean
  if (insights.length === 0) {
    insights.push({
      id: "baseline-status",
      type: "positive",
      title: "Clean Baseline Operations",
      description: "No significant waste anomalies or excessive leftover patterns detected in the selected period.",
      metricLabel: "Status",
      metricValue: "Optimal",
      calculationBasis: "Zero or minimal recorded leftovers across audited services",
    });
  }

  return insights;
}

/**
 * Pure helper: aggregates daily time series for charts.
 */
export function aggregateTimeSeries(
  meals: MealRecord[],
  consumptions: ConsumptionRecord[],
  surplusItems: SurplusRecord[],
  impactRecords: ImpactRecord[],
  predictions: PredictionRecord[]
) {
  const datesSet = new Set<string>();
  const consumptionMap = new Map<string, ConsumptionRecord>();
  for (const c of consumptions) {
    consumptionMap.set(c.meal_id, c);
  }

  for (const m of meals) datesSet.add(m.meal_date);
  for (const p of predictions) datesSet.add(p.prediction_date);
  for (const s of surplusItems) datesSet.add(s.reported_at.slice(0, 10));
  for (const imp of impactRecords) datesSet.add(imp.recorded_at.slice(0, 10));

  const sortedDates = Array.from(datesSet).sort();

  return sortedDates.map((date) => {
    let plannedMeals = 0;
    let preparedQuantity = 0;
    let consumedQuantity = 0;
    let leftoverQuantity = 0;
    let actualConsumersSum = 0;
    let actualConsumersCount = 0;

    for (const m of meals) {
      if (m.meal_date === date) {
        plannedMeals += 1;
        const c = consumptionMap.get(m.id);
        if (c) {
          preparedQuantity += Number(c.prepared_quantity) || 0;
          consumedQuantity += Number(c.consumed_quantity) || 0;
          leftoverQuantity += Number(c.leftover_quantity) || 0;
          actualConsumersSum += Number(c.actual_consumers) || 0;
          actualConsumersCount += 1;
        }
      }
    }

    let foodSavedKg = 0;
    for (const imp of impactRecords) {
      if (imp.recorded_at.slice(0, 10) === date) {
        foodSavedKg += Number(imp.food_saved_quantity) || 0;
      }
    }

    let predictedConsumers: number | null = null;
    for (const p of predictions) {
      if (p.prediction_date === date) {
        predictedConsumers = (predictedConsumers || 0) + Number(p.predicted_consumers);
      }
    }

    return {
      date,
      plannedMeals,
      preparedQuantity: Math.round(preparedQuantity * 100) / 100,
      consumedQuantity: Math.round(consumedQuantity * 100) / 100,
      leftoverQuantity: Math.round(leftoverQuantity * 100) / 100,
      foodSavedKg: Math.round(foodSavedKg * 100) / 100,
      predictedConsumers,
      actualConsumers: actualConsumersCount > 0 ? actualConsumersSum : null,
    };
  });
}

/**
 * Kitchen Analytics Orchestrator:
 * Queries database under server session and runs pure calculation modules.
 */
export async function getKitchenAnalytics(
  supabase: SupabaseClient<any, "public", any>,
  kitchenId: string,
  dateRange: { startIso: string | null; endIso: string },
  periodLabel: string
): Promise<KitchenAnalyticsSummary> {
  // 1. Fetch meals for this kitchen
  let mealsQuery = supabase
    .from("meals")
    .select("id, kitchen_id, meal_name, meal_date, meal_period, expected_consumers, planned_quantity, unit, created_at")
    .eq("kitchen_id", kitchenId)
    .order("meal_date", { ascending: true });

  if (dateRange.startIso) {
    mealsQuery = mealsQuery.gte("meal_date", dateRange.startIso.slice(0, 10));
  }
  mealsQuery = mealsQuery.lte("meal_date", dateRange.endIso.slice(0, 10));

  const { data: mealsData, error: mealsErr } = await mealsQuery;
  if (mealsErr) throw new Error(`Failed to load meals: ${mealsErr.message}`);
  const meals = (mealsData || []) as MealRecord[];

  const mealIds = meals.map((m) => m.id);

  // 2. Fetch consumption records for these meals
  let consumptions: ConsumptionRecord[] = [];
  if (mealIds.length > 0) {
    const { data: consumptionsData, error: cErr } = await supabase
      .from("consumption_records")
      .select("id, meal_id, actual_consumers, prepared_quantity, consumed_quantity, leftover_quantity, recorded_at")
      .in("meal_id", mealIds);
    if (cErr) throw new Error(`Failed to load consumption records: ${cErr.message}`);
    consumptions = (consumptionsData || []) as ConsumptionRecord[];
  }

  // 3. Fetch surplus items
  let surplusQuery = supabase
    .from("surplus_items")
    .select("id, kitchen_id, source_meal_id, food_name, quantity, unit, status, category, reported_at, redistribution_deadline")
    .eq("kitchen_id", kitchenId);

  if (dateRange.startIso) {
    surplusQuery = surplusQuery.gte("reported_at", dateRange.startIso);
  }
  surplusQuery = surplusQuery.lte("reported_at", dateRange.endIso);

  const { data: surplusData, error: surplusErr } = await surplusQuery;
  if (surplusErr) throw new Error(`Failed to load surplus items: ${surplusErr.message}`);
  const surplusItems = (surplusData || []) as SurplusRecord[];

  const surplusIds = surplusItems.map((s) => s.id);

  // 4. Fetch impact records for surplus items from this kitchen
  let impactRecords: ImpactRecord[] = [];
  if (surplusIds.length > 0) {
    const { data: impactData, error: impactErr } = await supabase
      .from("impact_records")
      .select("id, surplus_id, food_saved_quantity, estimated_meals_saved, estimated_waste_diverted, estimated_co2e_avoided, estimated_value_saved, recorded_at")
      .in("surplus_id", surplusIds);
    if (impactErr) throw new Error(`Failed to load impact records: ${impactErr.message}`);
    impactRecords = (impactData || []) as ImpactRecord[];
  }

  // 5. Fetch demand predictions for this kitchen
  let predQuery = supabase
    .from("demand_predictions")
    .select("id, kitchen_id, prediction_date, meal_period, predicted_consumers, recommended_quantity, predicted_surplus, confidence, model_version, created_at")
    .eq("kitchen_id", kitchenId);

  if (dateRange.startIso) {
    predQuery = predQuery.gte("prediction_date", dateRange.startIso.slice(0, 10));
  }
  predQuery = predQuery.lte("prediction_date", dateRange.endIso.slice(0, 10));

  const { data: predData, error: predErr } = await predQuery;
  if (predErr) throw new Error(`Failed to load predictions: ${predErr.message}`);
  const predictions = (predData || []) as PredictionRecord[];

  // 6. Fetch completed pickups count
  let completedPickupsCount = 0;
  if (surplusIds.length > 0) {
    const { count, error: pickupCountErr } = await supabase
      .from("pickup_requests")
      .select("id", { count: "exact", head: true })
      .in("surplus_id", surplusIds)
      .eq("status", "picked_up");
    if (!pickupCountErr && count !== null) {
      completedPickupsCount = count;
    }
  }

  // 7. Calculate modular metrics
  const operations = calculateMealOperations(meals, consumptions);
  const surplusMetrics = calculateSurplusMetrics(surplusItems);
  const impact = calculateImpactMetrics(impactRecords);
  const predictionPerf = calculatePredictionAccuracy(predictions, meals, consumptions);
  const mealPeriodBreakdown = calculateMealPeriodBreakdown(meals, consumptions);
  const insights = generateWasteInsights(meals, consumptions, surplusItems, impactRecords);
  const timeSeries = aggregateTimeSeries(meals, consumptions, surplusItems, impactRecords, predictions);

  return {
    period: periodLabel,
    dateRange: {
      start: dateRange.startIso,
      end: dateRange.endIso,
    },
    overview: {
      ...operations,
      totalActiveSurplusBatches: surplusMetrics.activeSurplusBatches,
      totalActiveSurplusKg: surplusMetrics.activeSurplusKg,
      totalCompletedPickups: completedPickupsCount,
    },
    impact,
    surplusStatusCounts: surplusMetrics.statusCounts,
    surplusCategoryCounts: surplusMetrics.categoryCounts,
    predictionPerformance: predictionPerf,
    timeSeries,
    mealPeriodBreakdown,
    insights,
  };
}
