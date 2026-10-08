import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { authenticateKitchenUser } from "@/lib/kitchen/auth";
import { updateSurplusSchema } from "@/lib/validation/surplus";
import { evaluateRecoveryDecision } from "@/lib/rules/recovery-engine";
import { computeRescueClock } from "@/lib/rules/rescue-clock";
import type { SurplusItemModel } from "@/types/models";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return errorResponse("VALIDATION_ERROR", "Invalid surplus UUID parameter", 400);
    }

    const supabase = await createClient();

    const { data: surplusRecords, error: fetchError } = await supabase
      .from("surplus_items")
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
        ai_confidence,
        image_path,
        notes,
        created_at,
        kitchens (
          id,
          name,
          address,
          timezone
        ),
        meals (
          id,
          meal_name,
          meal_date,
          meal_period,
          planned_quantity,
          unit
        )
      `)
      .eq("id", id)
      .returns<SurplusItemModel[]>();

    const surplus = surplusRecords?.[0];
    if (fetchError || !surplus) {
      return errorResponse("NOT_FOUND", "Surplus record not found", 404);
    }

    // Verify authorization
    const authResult = await authenticateKitchenUser(surplus.kitchen_id);
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    // Generate signed URL if image exists
    let signedImageUrl: string | null = null;
    if (surplus.image_path) {
      const { data: signedData } = await supabase.storage
        .from("food-images")
        .createSignedUrl(surplus.image_path, 3600);
      signedImageUrl = signedData?.signedUrl || null;
    }

    // Compute Rescue Clock & Recovery Decision
    const rescueClock = computeRescueClock(surplus.redistribution_deadline);
    const recoveryDecision = evaluateRecoveryDecision({
      status: surplus.status,
      category: surplus.category,
      preparedAt: surplus.prepared_at,
      redistributionDeadline: surplus.redistribution_deadline,
      quantity: Number(surplus.quantity),
      aiConfidence: surplus.ai_confidence ? Number(surplus.ai_confidence) : null,
    });

    return successResponse({
      id: surplus.id,
      kitchenId: surplus.kitchen_id,
      sourceMealId: surplus.source_meal_id,
      foodName: surplus.food_name,
      quantity: Number(surplus.quantity),
      unit: surplus.unit,
      preparedAt: surplus.prepared_at,
      reportedAt: surplus.reported_at,
      redistributionDeadline: surplus.redistribution_deadline,
      status: surplus.status,
      category: surplus.category,
      aiConfidence: surplus.ai_confidence ? Number(surplus.ai_confidence) : null,
      imagePath: surplus.image_path,
      signedImageUrl,
      notes: surplus.notes,
      createdAt: surplus.created_at,
      kitchen: surplus.kitchens || null,
      sourceMeal: surplus.meals || null,
      rescueClock,
      recoveryDecision,
      advisoryNotice: "AI visual assessment — advisory only. Not a microbiological food safety guarantee.",
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while retrieving surplus record", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return errorResponse("VALIDATION_ERROR", "Invalid surplus UUID parameter", 400);
    }

    const rawBody = await request.json();
    const parseResult = updateSurplusSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parseResult.error.errors[0]?.message || "Invalid surplus update payload",
        400,
        parseResult.error.flatten()
      );
    }

    const supabase = await createClient();

    // 1. Fetch current surplus record to verify authorization
    const { data: surplusRecords, error: fetchError } = await supabase
      .from("surplus_items")
      .select("id, kitchen_id, status")
      .eq("id", id)
      .returns<SurplusItemModel[]>();

    const surplus = surplusRecords?.[0];
    if (fetchError || !surplus) {
      return errorResponse("NOT_FOUND", "Surplus record not found", 404);
    }

    const authResult = await authenticateKitchenUser(surplus.kitchen_id);
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    // 2. Perform updates
    const updates: Record<string, unknown> = {};
    if (parseResult.data.status) updates.status = parseResult.data.status;
    if (parseResult.data.category) updates.category = parseResult.data.category;
    if (parseResult.data.notes !== undefined) updates.notes = parseResult.data.notes;
    if (parseResult.data.redistributionDeadline !== undefined) {
      updates.redistribution_deadline = parseResult.data.redistributionDeadline;
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse("VALIDATION_ERROR", "No update fields provided", 400);
    }

    const { data: updated, error: updateError } = await (supabase as any)
      .from("surplus_items")
      .update(updates)
      .eq("id", id)
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
        ai_confidence,
        image_path,
        notes,
        created_at
      `);

    const updatedItem = (updated as SurplusItemModel[])?.[0];
    if (updateError || !updatedItem) {
      return errorResponse("INTERNAL_SERVER_ERROR", `Failed to update surplus item: ${updateError?.message}`, 500);
    }

    return successResponse({
      id: updatedItem.id,
      kitchenId: updatedItem.kitchen_id,
      sourceMealId: updatedItem.source_meal_id,
      foodName: updatedItem.food_name,
      quantity: Number(updatedItem.quantity),
      unit: updatedItem.unit,
      status: updatedItem.status,
      category: updatedItem.category,
      aiConfidence: updatedItem.ai_confidence ? Number(updatedItem.ai_confidence) : null,
      notes: updatedItem.notes,
      redistributionDeadline: updatedItem.redistribution_deadline,
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while updating surplus record", 500);
  }
}
