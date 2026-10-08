import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { authenticateKitchenUser } from "@/lib/kitchen/auth";
import { createSurplusHandoffSchema } from "@/lib/validation/surplus";
import type { MealModel, SurplusItemModel } from "@/types/models";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parseResult = createSurplusHandoffSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parseResult.error.errors[0]?.message || "Invalid surplus handoff payload",
        400,
        parseResult.error.flatten()
      );
    }

    const {
      kitchenId,
      sourceMealId,
      foodName,
      quantity,
      unit,
      preparedAt,
      redistributionDeadline,
      notes,
    } = parseResult.data;

    // 1. Verify caller authorization for kitchen
    const authResult = await authenticateKitchenUser(kitchenId);
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    const supabase = await createClient();

    // 2. Verify source meal belongs to the specified kitchen
    const { data: meals, error: mealError } = await supabase
      .from("meals")
      .select("id, kitchen_id, meal_name, unit")
      .eq("id", sourceMealId)
      .returns<MealModel[]>();

    const meal = meals?.[0];
    if (mealError || !meal) {
      return errorResponse("NOT_FOUND", "Source meal record not found", 404);
    }

    if (meal.kitchen_id !== kitchenId) {
      return errorResponse("FORBIDDEN", "Source meal does not belong to the specified kitchen", 403);
    }

    // 3. Insert surplus item with status='active' and category='unknown' (Pending downstream AI classification)
    const { data: inserted, error: insertError } = await (supabase as any)
      .from("surplus_items")
      .insert({
        kitchen_id: kitchenId,
        source_meal_id: sourceMealId,
        food_name: foodName,
        quantity: quantity,
        unit: unit,
        prepared_at: preparedAt || null,
        reported_at: new Date().toISOString(),
        redistribution_deadline: redistributionDeadline || null,
        status: "active",
        category: "unknown",
        notes: notes || null,
      })
      .select(`
        id,
        kitchen_id,
        source_meal_id,
        food_name,
        quantity,
        unit,
        prepared_at,
        reported_at,
        redistribution_deadline,
        status,
        category,
        notes,
        created_at
      `);

    const surplus = (inserted as SurplusItemModel[])?.[0];
    if (insertError || !surplus) {
      return errorResponse("INTERNAL_SERVER_ERROR", insertError?.message || "Failed to create surplus record", 500);
    }

    return successResponse(
      {
        id: surplus.id,
        kitchenId: surplus.kitchen_id,
        sourceMealId: surplus.source_meal_id,
        foodName: surplus.food_name,
        quantity: Number(surplus.quantity),
        unit: surplus.unit,
        status: surplus.status,
        category: surplus.category,
        preparedAt: surplus.prepared_at,
        reportedAt: surplus.reported_at,
        redistributionDeadline: surplus.redistribution_deadline,
        notes: surplus.notes,
        createdAt: surplus.created_at,
      },
      201
    );
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred during surplus handoff", 500);
  }
}
