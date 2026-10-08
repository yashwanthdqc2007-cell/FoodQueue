import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { authenticateKitchenUser } from "@/lib/kitchen/auth";
import type { SurplusItemModel } from "@/types/models";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kitchenId = searchParams.get("kitchenId") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = Number(searchParams.get("limit")) || 50;
    const offset = Number(searchParams.get("offset")) || 0;

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
        notes,
        created_at
      `, { count: "exact" });

    if (kitchenId) {
      query = query.eq("kitchen_id", kitchenId);
    } else if (authResult.kitchen?.id) {
      query = query.eq("kitchen_id", authResult.kitchen.id);
    }

    if (status) {
      query = query.eq("status", status);
    }

    query = query.order("reported_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data: items, error: queryError, count } = await query.returns<SurplusItemModel[]>();

    if (queryError) {
      return errorResponse("INTERNAL_SERVER_ERROR", "Failed to retrieve surplus items", 500);
    }

    const formatted = (items || []).map((s) => ({
      id: s.id,
      kitchenId: s.kitchen_id,
      sourceMealId: s.source_meal_id,
      foodName: s.food_name,
      quantity: Number(s.quantity),
      unit: s.unit,
      status: s.status,
      category: s.category,
      preparedAt: s.prepared_at,
      reportedAt: s.reported_at,
      redistributionDeadline: s.redistribution_deadline,
      notes: s.notes,
      createdAt: s.created_at,
    }));

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
