import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { authenticateKitchenUser } from "@/lib/kitchen/auth";
import { updateMealSchema } from "@/lib/validation/meal";
import type { MealModel } from "@/types/models";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return errorResponse("VALIDATION_ERROR", "Invalid meal UUID parameter", 400);
    }

    const supabase = await createClient();

    const { data: meals, error: queryError } = await supabase
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
          category,
          reported_at
        )
      `)
      .eq("id", id)
      .returns<MealModel[]>();

    const meal = meals?.[0];
    if (queryError || !meal) {
      return errorResponse("NOT_FOUND", "Meal not found", 404);
    }

    // Verify caller authorization
    const authResult = await authenticateKitchenUser(meal.kitchen_id);
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    const consumption = meal.consumption_records?.[0] || null;

    return successResponse({
      id: meal.id,
      kitchenId: meal.kitchen_id,
      mealName: meal.meal_name,
      mealDate: meal.meal_date,
      mealPeriod: meal.meal_period,
      expectedConsumers: meal.expected_consumers,
      plannedQuantity: Number(meal.planned_quantity),
      unit: meal.unit,
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
      surplusItems: meal.surplus_items || [],
      createdAt: meal.created_at,
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while retrieving meal", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return errorResponse("VALIDATION_ERROR", "Invalid meal UUID parameter", 400);
    }

    const rawBody = await request.json();
    const parseResult = updateMealSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parseResult.error.errors[0]?.message || "Invalid update payload",
        400,
        parseResult.error.flatten()
      );
    }

    const updates = parseResult.data;
    if (Object.keys(updates).length === 0) {
      return errorResponse("VALIDATION_ERROR", "No update fields provided", 400);
    }

    const supabase = await createClient();

    // 1. Fetch existing meal with attached consumption records
    const { data: existingMeals, error: fetchError } = await supabase
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
        consumption_records (id)
      `)
      .eq("id", id)
      .returns<MealModel[]>();

    const existingMeal = existingMeals?.[0];
    if (fetchError || !existingMeal) {
      return errorResponse("NOT_FOUND", "Meal not found", 404);
    }

    // 2. Verify authorization
    const authResult = await authenticateKitchenUser(existingMeal.kitchen_id);
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    // 3. Immutability guard: Meal with consumption records cannot be updated
    if (existingMeal.consumption_records && existingMeal.consumption_records.length > 0) {
      return errorResponse(
        "UNPROCESSABLE_ENTITY",
        "Meal cannot be modified because a consumption audit record has already been recorded",
        422
      );
    }

    // 4. Perform update
    const dbUpdates: Record<string, unknown> = {};
    if (updates.mealName !== undefined) dbUpdates.meal_name = updates.mealName;
    if (updates.mealDate !== undefined) dbUpdates.meal_date = updates.mealDate;
    if (updates.mealPeriod !== undefined) dbUpdates.meal_period = updates.mealPeriod;
    if (updates.expectedConsumers !== undefined) dbUpdates.expected_consumers = updates.expectedConsumers;
    if (updates.plannedQuantity !== undefined) dbUpdates.planned_quantity = updates.plannedQuantity;
    if (updates.unit !== undefined) dbUpdates.unit = updates.unit;

    const { data: updatedMeals, error: updateError } = await (supabase as any)
      .from("meals")
      .update(dbUpdates)
      .eq("id", id)
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

    const updated = (updatedMeals as MealModel[])?.[0];
    if (updateError || !updated) {
      return errorResponse("INTERNAL_SERVER_ERROR", "Failed to update meal", 500);
    }

    return successResponse({
      id: updated.id,
      kitchenId: updated.kitchen_id,
      mealName: updated.meal_name,
      mealDate: updated.meal_date,
      mealPeriod: updated.meal_period,
      expectedConsumers: updated.expected_consumers,
      plannedQuantity: Number(updated.planned_quantity),
      unit: updated.unit,
      createdAt: updated.created_at,
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while updating meal", 500);
  }
}
