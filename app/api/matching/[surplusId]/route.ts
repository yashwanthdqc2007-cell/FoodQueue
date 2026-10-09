import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { computeRescueClock } from "@/lib/rules/rescue-clock";
import type { SurplusItemModel, RedistributionMatchModel, ProfileModel, KitchenModel, OrganizationModel, ReceiverModel } from "@/types/models";

interface RouteParams {
  params: Promise<{ surplusId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { surplusId } = await params;
    if (!surplusId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(surplusId)) {
      return errorResponse("VALIDATION_ERROR", "Invalid surplus UUID parameter", 400);
    }

    const supabase = await createClient();

    // 1. Authenticate caller
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, role, organization_id")
      .eq("id", userData.user.id)
      .returns<ProfileModel[]>();

    const profile = profiles?.[0];
    if (!profile) {
      return errorResponse("UNAUTHORIZED", "Profile not found", 401);
    }

    // 2. Fetch surplus item
    const { data: surplusRecords, error: surplusError } = await supabase
      .from("surplus_items")
      .select(`
        id,
        kitchen_id,
        food_name,
        quantity,
        unit,
        prepared_at,
        reported_at,
        redistribution_deadline,
        status,
        category,
        notes,
        created_at,
        kitchens (
          id,
          organization_id,
          name,
          latitude,
          longitude,
          organizations (
            id,
            name,
            latitude,
            longitude
          )
        )
      `)
      .eq("id", surplusId)
      .returns<SurplusItemModel[]>();

    const surplus = surplusRecords?.[0];
    if (surplusError || !surplus) {
      return errorResponse("NOT_FOUND", "Surplus item not found", 404);
    }

    const kitchenData = surplus.kitchens as (KitchenModel & { organizations?: OrganizationModel | null }) | null;
    const kitchenCoords = kitchenData?.latitude && kitchenData?.longitude
      ? { latitude: Number(kitchenData.latitude), longitude: Number(kitchenData.longitude) }
      : kitchenData?.organizations?.latitude && kitchenData?.organizations?.longitude
      ? { latitude: Number(kitchenData.organizations.latitude), longitude: Number(kitchenData.organizations.longitude) }
      : null;

    // 3. Authorization check
    const isAdmin = profile.role === "admin";
    const isOwnerKitchen = profile.role === "kitchen" && profile.organization_id === kitchenData?.organization_id;
    const isReceiver = profile.role === "receiver";

    if (!isAdmin && !isOwnerKitchen && !isReceiver) {
      return errorResponse("FORBIDDEN", "Forbidden: You do not have access to these matches", 403);
    }

    // 4. Fetch matches
    let matchQuery = supabase
      .from("redistribution_matches")
      .select(`
        id,
        surplus_id,
        receiver_id,
        match_score,
        match_reason,
        status,
        created_at,
        receivers (
          id,
          organization_id,
          receiver_type,
          max_capacity,
          priority_level,
          verified,
          organizations (
            id,
            name,
            address,
            latitude,
            longitude,
            contact_phone
          )
        )
      `)
      .eq("surplus_id", surplusId)
      .order("match_score", { ascending: false });

    // If receiver, filter matches to own organization only
    if (isReceiver && !isAdmin) {
      // Find receiver's receiver ID
      const { data: receiverEntities } = await supabase
        .from("receivers")
        .select("id")
        .eq("organization_id", profile.organization_id!)
        .returns<ReceiverModel[]>();

      const receiverId = receiverEntities?.[0]?.id;
      if (!receiverId) {
        return successResponse({
          surplusId,
          matches: [],
        });
      }
      matchQuery = matchQuery.eq("receiver_id", receiverId);
    }

    const { data: matches, error: matchError } = await matchQuery.returns<RedistributionMatchModel[]>();

    if (matchError) {
      return errorResponse("INTERNAL_SERVER_ERROR", "Failed to retrieve matches", 500);
    }

    const clock = computeRescueClock(surplus.redistribution_deadline);

    const formattedMatches = (matches || []).map((m, index) => {
      const rec = m.receivers as (ReceiverModel & { organizations?: OrganizationModel | null }) | null;
      const org = rec?.organizations;
      const reasons = Array.isArray(m.match_reason)
        ? m.match_reason
        : typeof m.match_reason === "string"
        ? JSON.parse(m.match_reason || "[]")
        : [];

      return {
        matchId: m.id,
        rank: index + 1,
        isTopRecommended: index === 0,
        receiverId: m.receiver_id,
        organizationId: rec?.organization_id || null,
        receiverName: org?.name || "Community Partner",
        receiverType: rec?.receiver_type || "ngo",
        address: org?.address || null,
        contactPhone: org?.contact_phone || null,
        coordinates: org?.latitude && org?.longitude
          ? { latitude: Number(org.latitude), longitude: Number(org.longitude) }
          : null,
        maxCapacity: rec?.max_capacity ? Number(rec.max_capacity) : 0,
        finalScore: Number(m.match_score),
        status: m.status,
        explainableReasons: reasons,
        createdAt: m.created_at,
      };
    });

    return successResponse({
      surplusId,
      foodName: surplus.food_name,
      quantity: Number(surplus.quantity),
      unit: surplus.unit,
      status: surplus.status,
      category: surplus.category,
      kitchenName: kitchenData?.name || "Kitchen Facility",
      kitchenCoordinates: kitchenCoords,
      rescueClock: clock,
      matches: formattedMatches,
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while fetching matches", 500);
  }
}
