import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { authenticateKitchenUser } from "@/lib/kitchen/auth";
import { createConsumptionSchema } from "@/lib/validation/consumption";
import type { MealModel, ConsumptionRecordModel } from "@/types/models";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parseResult = createConsumptionSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parseResult.error.errors[0]?.message || "Invalid consumption audit data",
        400,
        parseResult.error.flatten()
      );
    }

    const { mealId, actualConsumers, preparedQuantity, consumedQuantity, leftoverQuantity } = parseResult.data;

    const supabase = await createClient();

    // 1. Fetch meal to verify existence, kitchen_id, and ensure no existing consumption record
    const { data: meals, error: mealError } = await supabase
      .from("meals")
      .select(`
        id,
        kitchen_id,
        meal_name,
        meal_date,
        meal_period,
        planned_quantity,
        unit,
        consumption_records (id)
      `)
      .eq("id", mealId)
      .returns<MealModel[]>();

    const meal = meals?.[0];
    if (mealError || !meal) {
      return errorResponse("NOT_FOUND", "Target meal not found", 404);
    }

    // 2. Check authorization for meal's kitchen
    const authResult = await authenticateKitchenUser(meal.kitchen_id);
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    // 3. Uniqueness guard: only 1 consumption record per meal
    if (meal.consumption_records && meal.consumption_records.length > 0) {
      return errorResponse(
        "CONFLICT",
        "A consumption audit record has already been recorded for this meal",
        409
      );
    }

    // 4. Insert consumption record
    const { data: inserted, error: insertError } = await (supabase as any)
      .from("consumption_records")
      .insert({
        meal_id: mealId,
        actual_consumers: actualConsumers,
        prepared_quantity: preparedQuantity,
        consumed_quantity: consumedQuantity,
        leftover_quantity: leftoverQuantity,
      })
      .select(`
        id,
        meal_id,
        actual_consumers,
        prepared_quantity,
        consumed_quantity,
        leftover_quantity,
        recorded_at
      `);

    const consumption = (inserted as ConsumptionRecordModel[])?.[0];
    if (insertError || !consumption) {
      return errorResponse(
        "INTERNAL_SERVER_ERROR",
        insertError?.message || "Failed to record consumption audit",
        500
      );
    }

    return successResponse(
      {
        id: consumption.id,
        mealId: consumption.meal_id,
        actualConsumers: consumption.actual_consumers,
        preparedQuantity: Number(consumption.prepared_quantity),
        consumedQuantity: Number(consumption.consumed_quantity),
        leftoverQuantity: Number(consumption.leftover_quantity),
        hasLeftover: Number(consumption.leftover_quantity) > 0,
        recordedAt: consumption.recorded_at,
      },
      201
    );
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while recording consumption", 500);
  }
}
