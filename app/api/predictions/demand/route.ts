import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { authenticateKitchenUser } from "@/lib/kitchen/auth";
import { demandPredictionPostSchema, demandPredictionQuerySchema } from "@/lib/validation/prediction";
import { computeDemandPrediction, type HistoricalRecord } from "@/lib/prediction/baseline";
import type { DemandPredictionModel } from "@/types/models";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parseResult = demandPredictionPostSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parseResult.error.errors[0]?.message || "Invalid prediction request payload",
        400,
        parseResult.error.flatten()
      );
    }

    const { kitchenId, predictionDate, mealPeriod, expectedConsumers, unit, baselinePortionRatio } = parseResult.data;

    // 1. Verify caller authorization for kitchen
    const authResult = await authenticateKitchenUser(kitchenId);
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    const supabase = await createClient();

    // 2. Fetch historical records for the same kitchen and same meal_period prior to predictionDate
    const { data: pastMeals, error: queryError } = await supabase
      .from("meals")
      .select(`
        id,
        meal_date,
        meal_period,
        unit,
        consumption_records (
          id,
          actual_consumers,
          prepared_quantity,
          consumed_quantity,
          leftover_quantity
        )
      `)
      .eq("kitchen_id", kitchenId)
      .eq("meal_period", mealPeriod)
      .lt("meal_date", predictionDate)
      .order("meal_date", { ascending: false })
      .limit(60);

    if (queryError) {
      return errorResponse("INTERNAL_SERVER_ERROR", "Failed to retrieve historical consumption records", 500);
    }

    // 3. Format historical records for deterministic prediction engine
    const historicalRecords: HistoricalRecord[] = [];
    if (pastMeals) {
      for (const m of pastMeals as any[]) {
        const consumption = m.consumption_records?.[0];
        if (consumption && consumption.actual_consumers > 0 && consumption.prepared_quantity >= 0) {
          historicalRecords.push({
            mealDate: m.meal_date,
            actualConsumers: consumption.actual_consumers,
            preparedQuantity: Number(consumption.prepared_quantity),
            unit: m.unit,
          });
        }
      }
    }

    // 4. Compute deterministic prediction
    const prediction = computeDemandPrediction({
      targetDate: predictionDate,
      targetUnit: unit,
      expectedConsumers,
      baselinePortionRatio,
      historicalRecords,
    });

    // 5. Persist prediction snapshot in public.demand_predictions
    const { data: inserted, error: insertError } = await (supabase as any)
      .from("demand_predictions")
      .insert({
        kitchen_id: kitchenId,
        prediction_date: predictionDate,
        meal_period: mealPeriod,
        predicted_consumers: prediction.predictedConsumers,
        recommended_quantity: prediction.recommendedQuantity,
        predicted_surplus: prediction.predictedSurplus,
        confidence: prediction.confidence,
        model_version: prediction.modelVersion,
      })
      .select(`
        id,
        kitchen_id,
        prediction_date,
        meal_period,
        predicted_consumers,
        recommended_quantity,
        predicted_surplus,
        confidence,
        model_version,
        created_at
      `);

    const record = (inserted as DemandPredictionModel[])?.[0];

    return successResponse({
      id: record?.id || null,
      kitchenId,
      predictionDate,
      mealPeriod,
      predictedConsumers: prediction.predictedConsumers,
      portionRatio: prediction.portionRatio,
      recommendedQuantity: prediction.recommendedQuantity,
      predictedSurplus: prediction.predictedSurplus,
      confidence: prediction.confidence,
      confidenceTier: prediction.confidenceTier,
      breakdown: prediction.breakdown,
      modelVersion: prediction.modelVersion,
      createdAt: record?.created_at || new Date().toISOString(),
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while computing demand prediction", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = {
      kitchenId: searchParams.get("kitchenId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      mealPeriod: searchParams.get("mealPeriod") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    };

    const parseResult = demandPredictionQuerySchema.safeParse(queryParams);
    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parseResult.error.errors[0]?.message || "Invalid query parameters",
        400,
        parseResult.error.flatten()
      );
    }

    const { kitchenId, startDate, endDate, mealPeriod, limit, offset } = parseResult.data;

    // Verify caller authorization
    const authResult = await authenticateKitchenUser(kitchenId);
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    const supabase = await createClient();

    let query = supabase
      .from("demand_predictions")
      .select(`
        id,
        kitchen_id,
        prediction_date,
        meal_period,
        predicted_consumers,
        recommended_quantity,
        predicted_surplus,
        confidence,
        model_version,
        created_at
      `, { count: "exact" });

    if (kitchenId) {
      query = query.eq("kitchen_id", kitchenId);
    } else if (authResult.kitchen?.id) {
      query = query.eq("kitchen_id", authResult.kitchen.id);
    }

    if (startDate) {
      query = query.gte("prediction_date", startDate);
    }
    if (endDate) {
      query = query.lte("prediction_date", endDate);
    }
    if (mealPeriod) {
      query = query.eq("meal_period", mealPeriod);
    }

    query = query.order("prediction_date", { ascending: false }).order("created_at", { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const { data: predictions, error: queryError, count } = await query.returns<DemandPredictionModel[]>();

    if (queryError) {
      return errorResponse("INTERNAL_SERVER_ERROR", "Failed to retrieve demand predictions", 500);
    }

    const formatted = (predictions || []).map((p) => ({
      id: p.id,
      kitchenId: p.kitchen_id,
      predictionDate: p.prediction_date,
      mealPeriod: p.meal_period,
      predictedConsumers: p.predicted_consumers,
      recommendedQuantity: Number(p.recommended_quantity),
      predictedSurplus: Number(p.predicted_surplus),
      confidence: p.confidence !== null ? Number(p.confidence) : null,
      modelVersion: p.model_version,
      createdAt: p.created_at,
    }));

    return successResponse({
      predictions: formatted,
      total: count ?? formatted.length,
      limit,
      offset,
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while querying predictions", 500);
  }
}
