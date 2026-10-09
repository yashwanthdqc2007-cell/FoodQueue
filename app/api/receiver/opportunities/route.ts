import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { authenticateReceiverUser } from "@/lib/receiver/auth";
import { computeRescueClock } from "@/lib/rules/rescue-clock";
import type { RedistributionMatchModel, SurplusItemModel, KitchenModel, OrganizationModel } from "@/types/models";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") || "recommended"; // 'recommended', 'accepted', 'rejected', 'all'
    const limit = Number(searchParams.get("limit")) || 50;
    const offset = Number(searchParams.get("offset")) || 0;

    const authResult = await authenticateReceiverUser();
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    const receiver = authResult.receiver;
    if (!receiver) {
      return successResponse({
        opportunities: [],
        total: 0,
        limit,
        offset,
      });
    }

    const supabase = await createClient();

    let query = supabase
      .from("redistribution_matches")
      .select(`
        id,
        surplus_id,
        receiver_id,
        match_score,
        match_reason,
        status,
        created_at,
        surplus_items (
          id,
          kitchen_id,
          food_name,
          quantity,
          unit,
          category,
          status,
          prepared_at,
          reported_at,
          redistribution_deadline,
          image_path,
          notes,
          kitchens (
            id,
            name,
            address,
            latitude,
            longitude,
            organizations (
              id,
              name,
              address,
              contact_phone
            )
          )
        )
      `, { count: "exact" })
      .eq("receiver_id", receiver.id);

    if (statusParam !== "all") {
      query = query.eq("status", statusParam);
    }

    query = query.order("match_score", { ascending: false }).range(offset, offset + limit - 1);

    const { data: matchRows, error: matchError, count } = await query.returns<RedistributionMatchModel[]>();

    if (matchError) {
      return errorResponse("INTERNAL_SERVER_ERROR", "Failed to retrieve opportunities", 500);
    }

    // Generate signed image URLs for opportunities
    const formatted = await Promise.all(
      (matchRows || []).map(async (m) => {
        const surplus = m.surplus_items as (SurplusItemModel & {
          kitchens?: (KitchenModel & { organizations?: OrganizationModel | null }) | null;
        }) | null;

        let signedImageUrl: string | null = null;
        if (surplus?.image_path) {
          const { data: signedData } = await supabase.storage
            .from("food-images")
            .createSignedUrl(surplus.image_path, 3600);
          signedImageUrl = signedData?.signedUrl || null;
        }

        const clock = computeRescueClock(surplus?.redistribution_deadline);
        const reasons = Array.isArray(m.match_reason)
          ? m.match_reason
          : typeof m.match_reason === "string"
          ? JSON.parse(m.match_reason || "[]")
          : [];

        const kitchen = surplus?.kitchens;
        const kitchenOrg = kitchen?.organizations;

        return {
          matchId: m.id,
          surplusId: m.surplus_id,
          matchScore: Number(m.match_score),
          status: m.status,
          createdAt: m.created_at,
          explainableReasons: reasons,
          foodName: surplus?.food_name || "Food Batch",
          quantity: surplus?.quantity ? Number(surplus.quantity) : 0,
          unit: surplus?.unit || "kg",
          category: surplus?.category || "unknown",
          surplusStatus: surplus?.status || "active",
          preparedAt: surplus?.prepared_at || null,
          reportedAt: surplus?.reported_at || m.created_at,
          redistributionDeadline: surplus?.redistribution_deadline || null,
          signedImageUrl,
          notes: surplus?.notes || null,
          kitchen: {
            name: kitchen?.name || kitchenOrg?.name || "Partner Kitchen",
            address: kitchen?.address || kitchenOrg?.address || "Address available upon acceptance",
            contactPhone: kitchenOrg?.contact_phone || null,
            coordinates: kitchen?.latitude && kitchen?.longitude
              ? { latitude: Number(kitchen.latitude), longitude: Number(kitchen.longitude) }
              : null,
          },
          rescueClock: clock,
        };
      })
    );

    return successResponse({
      opportunities: formatted,
      total: count ?? formatted.length,
      limit,
      offset,
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while fetching opportunities", 500);
  }
}
