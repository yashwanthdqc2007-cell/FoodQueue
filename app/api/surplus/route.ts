import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { authenticateKitchenUser } from "@/lib/kitchen/auth";
import { surplusQuerySchema } from "@/lib/validation/surplus";
import { evaluateRecoveryDecision } from "@/lib/rules/recovery-engine";
import { computeRescueClock } from "@/lib/rules/rescue-clock";
import type { SurplusItemModel } from "@/types/models";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = {
      kitchenId: searchParams.get("kitchenId") || undefined,
      status: searchParams.get("status") || undefined,
      category: searchParams.get("category") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    };

    const parseResult = surplusQuerySchema.safeParse(queryParams);
    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parseResult.error.errors[0]?.message || "Invalid query parameters",
        400,
        parseResult.error.flatten()
      );
    }

    const { kitchenId, status, category, limit, offset } = parseResult.data;

    const authResult = await authenticateKitchenUser(kitchenId);
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    const supabase = await createClient();

    let query = supabase
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
        meals (
          id,
          meal_name,
          meal_period
        )
      `, { count: "exact" });

    if (kitchenId) {
      query = query.eq("kitchen_id", kitchenId);
    } else if (authResult.kitchen?.id) {
      query = query.eq("kitchen_id", authResult.kitchen.id);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (category) {
      query = query.eq("category", category);
    }

    query = query.order("reported_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data: items, error: queryError, count } = await query.returns<SurplusItemModel[]>();

    if (queryError) {
      return errorResponse("INTERNAL_SERVER_ERROR", "Failed to retrieve surplus items", 500);
    }

    // Generate signed URLs in batch for items with image_path
    const formatted = await Promise.all(
      (items || []).map(async (s) => {
        let signedImageUrl: string | null = null;
        if (s.image_path) {
          const { data: signedData } = await supabase.storage
            .from("food-images")
            .createSignedUrl(s.image_path, 3600);
          signedImageUrl = signedData?.signedUrl || null;
        }

        const rescueClock = computeRescueClock(s.redistribution_deadline);
        const recoveryDecision = evaluateRecoveryDecision({
          status: s.status,
          category: s.category,
          preparedAt: s.prepared_at,
          redistributionDeadline: s.redistribution_deadline,
          quantity: Number(s.quantity),
          aiConfidence: s.ai_confidence ? Number(s.ai_confidence) : null,
        });

        return {
          id: s.id,
          kitchenId: s.kitchen_id,
          sourceMealId: s.source_meal_id,
          foodName: s.food_name,
          quantity: Number(s.quantity),
          unit: s.unit,
          status: s.status,
          category: s.category,
          aiConfidence: s.ai_confidence ? Number(s.ai_confidence) : null,
          imagePath: s.image_path,
          signedImageUrl,
          preparedAt: s.prepared_at,
          reportedAt: s.reported_at,
          redistributionDeadline: s.redistribution_deadline,
          notes: s.notes,
          createdAt: s.created_at,
          sourceMeal: s.meals || null,
          rescueClock,
          recoveryDecision,
        };
      })
    );

    return successResponse({
      surplusItems: formatted,
      total: count ?? formatted.length,
      limit,
      offset,
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while querying surplus items", 500);
  }
}
