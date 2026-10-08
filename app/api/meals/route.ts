import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { authenticateKitchenUser } from "@/lib/kitchen/auth";
import { createMealSchema, mealQuerySchema } from "@/lib/validation/meal";
import type { MealModel } from "@/types/models";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parseResult = createMealSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parseResult.error.errors[0]?.message || "Invalid meal data",
        400,
        parseResult.error.flatten()
      );
    }

    const { kitchenId, mealName, mealDate, mealPeriod, expectedConsumers, plannedQuantity, unit } = parseResult.data;

    // Verify caller authorization for target kitchen
    const authResult = await authenticateKitchenUser(kitchenId);
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    const supabase = await createClient();

    const { data: inserted, error: insertError } = await (supabase as any)
      .from("meals")
      .insert({
        kitchen_id: kitchenId,
        meal_name: mealName,
        meal_date: mealDate,
        meal_period: mealPeriod,
        expected_consumers: expectedConsumers,
        planned_quantity: plannedQuantity,
        unit: unit,
      })
      .select(`
        id,
        kitchen_id,
        meal_name,
        meal_date,
        meal_period,
        expected_consumers,
        planned_quantity,
        unit,
        created_at
      `);

    const meal = (inserted as MealModel[])?.[0];

    if (insertError || !meal) {
      return errorResponse("INTERNAL_SERVER_ERROR", insertError?.message || "Failed to create meal", 500);
    }

    return successResponse(
      {
        id: meal.id,
        kitchenId: meal.kitchen_id,
        mealName: meal.meal_name,
        mealDate: meal.meal_date,
        mealPeriod: meal.meal_period,
        expectedConsumers: meal.expected_consumers,
        plannedQuantity: Number(meal.planned_quantity),
        unit: meal.unit,
        createdAt: meal.created_at,
      },
      201
    );
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while creating meal", 500);
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

    const parseResult = mealQuerySchema.safeParse(queryParams);
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
      .from("meals")
      .select(`
        id,
        kitchen_id,
        meal_name,
        meal_date,
        meal_period,
        expected_consumers,
        planned_quantity,
        unit,
        created_at,
        consumption_records (
          id,
          actual_consumers,
          prepared_quantity,
          consumed_quantity,
          leftover_quantity,
          recorded_at
        ),
        surplus_items (
          id,
          status,
          quantity,
          unit,
          category
        )
      `, { count: "exact" });

    if (kitchenId) {
      query = query.eq("kitchen_id", kitchenId);
    } else if (authResult.kitchen?.id) {
      query = query.eq("kitchen_id", authResult.kitchen.id);
    }

    if (startDate) {
      query = query.gte("meal_date", startDate);
    }
    if (endDate) {
      query = query.lte("meal_date", endDate);
    }
    if (mealPeriod) {
      query = query.eq("meal_period", mealPeriod);
    }

    query = query.order("meal_date", { ascending: false }).order("created_at", { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const { data: meals, error: queryError, count } = await query.returns<MealModel[]>();

    if (queryError) {
      return errorResponse("INTERNAL_SERVER_ERROR", "Failed to retrieve meals", 500);
    }

    const formattedMeals = (meals || []).map((m) => {
      const consumption = m.consumption_records?.[0] || null;
      return {
        id: m.id,
        kitchenId: m.kitchen_id,
        mealName: m.meal_name,
        mealDate: m.meal_date,
        mealPeriod: m.meal_period,
        expectedConsumers: m.expected_consumers,
        plannedQuantity: Number(m.planned_quantity),
        unit: m.unit,
        hasConsumptionRecorded: Boolean(consumption),
        consumptionRecord: consumption
          ? {
              id: consumption.id,
              actualConsumers: consumption.actual_consumers,
              preparedQuantity: Number(consumption.prepared_quantity),
              consumedQuantity: Number(consumption.consumed_quantity),
              leftoverQuantity: Number(consumption.leftover_quantity),
              recordedAt: consumption.recorded_at,
            }
          : null,
        surplusCount: m.surplus_items?.length || 0,
        createdAt: m.created_at,
      };
    });

    return successResponse({
      meals: formattedMeals,
      total: count ?? formattedMeals.length,
      limit,
      offset,
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while querying meals", 500);
  }
}
