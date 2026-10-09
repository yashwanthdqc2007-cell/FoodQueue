import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { authenticateKitchenUser } from "@/lib/kitchen/auth";
import { generateMatchesSchema } from "@/lib/validation/matching";
import { evaluateReceiverEligibility } from "@/lib/matching/eligibility";
import { computeMatchScore } from "@/lib/matching/scoring";
import { computeRescueClock } from "@/lib/rules/rescue-clock";
import type { SurplusItemModel, ReceiverModel, KitchenModel, OrganizationModel, RedistributionMatchModel } from "@/types/models";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parseResult = generateMatchesSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parseResult.error.errors[0]?.message || "Invalid match generation payload",
        400,
        parseResult.error.flatten()
      );
    }

    const { surplusId } = parseResult.data;

    const supabase = await createClient();

    // 1. Fetch surplus item with source kitchen and organization details
    const { data: surplusRecords, error: surplusError } = await supabase
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
      return errorResponse("NOT_FOUND", "Target surplus record not found", 404);
    }

    // 2. Authorize caller for surplus kitchen
    const authResult = await authenticateKitchenUser(surplus.kitchen_id);
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    // 3. Verify surplus is active and not expired
    const clock = computeRescueClock(surplus.redistribution_deadline);
    if (surplus.status !== "active") {
      return errorResponse(
        "UNPROCESSABLE_ENTITY",
        `Cannot generate matches: Surplus status is '${surplus.status}', must be 'active'.`,
        422
      );
    }

    if (clock.isExpired) {
      return errorResponse(
        "UNPROCESSABLE_ENTITY",
        "Cannot generate matches: Redistribution deadline has already expired.",
        422
      );
    }

    const kitchenData = surplus.kitchens as (KitchenModel & { organizations?: OrganizationModel | null }) | null;
    const kitchenOrgId = kitchenData?.organization_id || "";
    const kitchenCoords = kitchenData?.latitude && kitchenData?.longitude
      ? { latitude: Number(kitchenData.latitude), longitude: Number(kitchenData.longitude) }
      : kitchenData?.organizations?.latitude && kitchenData?.organizations?.longitude
      ? { latitude: Number(kitchenData.organizations.latitude), longitude: Number(kitchenData.organizations.longitude) }
      : null;

    // 4. Batch fetch all receivers with organization details
    const { data: receivers, error: receiverError } = await supabase
      .from("receivers")
      .select(`
        id,
        organization_id,
        receiver_type,
        max_capacity,
        accepted_food_types,
        operating_hours,
        priority_level,
        verified,
        created_at,
        organizations (
          id,
          name,
          address,
          latitude,
          longitude,
          contact_phone
        )
      `)
      .returns<(ReceiverModel & { organizations?: OrganizationModel | null })[]>();

    if (receiverError || !receivers) {
      return errorResponse("INTERNAL_SERVER_ERROR", "Failed to retrieve receiver database", 500);
    }

    // 5. Evaluate eligibility and score each candidate
    const candidates = receivers.map((receiver) => {
      const org = receiver.organizations;
      const orgName = org?.name || "Community Partner";
      const receiverCoords = org?.latitude && org?.longitude
        ? { latitude: Number(org.latitude), longitude: Number(org.longitude) }
        : null;

      const acceptedFoodTypes = Array.isArray(receiver.accepted_food_types)
        ? receiver.accepted_food_types
        : typeof receiver.accepted_food_types === "string"
        ? JSON.parse(receiver.accepted_food_types || "[]")
        : [];

      // Check eligibility
      const eligibility = evaluateReceiverEligibility(
        {
          id: surplus.id,
          foodName: surplus.food_name,
          quantity: Number(surplus.quantity),
          unit: surplus.unit,
          category: surplus.category,
          status: surplus.status,
          isExpired: clock.isExpired,
          kitchenOrgId,
        },
        {
          id: receiver.id,
          organizationId: receiver.organization_id,
          organizationName: orgName,
          verified: receiver.verified,
          maxCapacity: Number(receiver.max_capacity),
          acceptedFoodTypes,
          receiverType: receiver.receiver_type,
        }
      );

      // Calculate score
      const scoring = computeMatchScore(
        {
          quantity: Number(surplus.quantity),
          remainingMinutes: clock.remainingMinutes,
          isExpired: clock.isExpired,
          coordinates: kitchenCoords,
        },
        {
          maxCapacity: Number(receiver.max_capacity),
          priorityLevel: receiver.priority_level,
          coordinates: receiverCoords,
        }
      );

      return {
        receiverId: receiver.id,
        organizationId: receiver.organization_id,
        receiverName: orgName,
        receiverType: receiver.receiver_type,
        address: org?.address || null,
        contactPhone: org?.contact_phone || null,
        coordinates: receiverCoords,
        maxCapacity: Number(receiver.max_capacity),
        priorityLevel: receiver.priority_level,
        verified: receiver.verified,
        eligible: eligibility.eligible,
        reasonCodes: eligibility.reasonCodes,
        rejectionReasons: eligibility.rejectionReasons,
        finalScore: scoring.finalScore,
        breakdown: scoring.breakdown,
        explainableReasons: scoring.explainableReasons,
      };
    });

    // 6. Filter only eligible candidates and sort descending by finalScore
    const eligibleCandidates = candidates
      .filter((c) => c.eligible)
      .sort((a, b) => b.finalScore - a.finalScore);

    // 7. Persist matches into public.redistribution_matches (upsert)
    if (eligibleCandidates.length > 0) {
      const matchRows = eligibleCandidates.map((c) => ({
        surplus_id: surplusId,
        receiver_id: c.receiverId,
        match_score: c.finalScore,
        match_reason: c.explainableReasons,
        status: "recommended",
      }));

      const { error: upsertError } = await (supabase as any)
        .from("redistribution_matches")
        .upsert(matchRows, {
          onConflict: "surplus_id,receiver_id",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error("Match upsert warning:", upsertError);
      }
    }

    // 8. Fetch persisted matches to include primary IDs
    const { data: persistedMatches } = await supabase
      .from("redistribution_matches")
      .select("id, surplus_id, receiver_id, match_score, match_reason, status, created_at")
      .eq("surplus_id", surplusId)
      .returns<RedistributionMatchModel[]>();

    const matchIdMap = new Map((persistedMatches || []).map((m) => [m.receiver_id, m.id]));

    const rankedResults = eligibleCandidates.map((c, index) => ({
      matchId: matchIdMap.get(c.receiverId) || null,
      rank: index + 1,
      isTopRecommended: index === 0,
      receiverId: c.receiverId,
      organizationId: c.organizationId,
      receiverName: c.receiverName,
      receiverType: c.receiverType,
      address: c.address,
      contactPhone: c.contactPhone,
      coordinates: c.coordinates,
      maxCapacity: c.maxCapacity,
      distanceKm: c.breakdown.distanceKm,
      finalScore: c.finalScore,
      breakdown: c.breakdown,
      explainableReasons: c.explainableReasons,
      status: "recommended",
    }));

    return successResponse({
      surplusId,
      foodName: surplus.food_name,
      quantity: Number(surplus.quantity),
      unit: surplus.unit,
      kitchenName: kitchenData?.name || "Origin Kitchen",
      kitchenCoordinates: kitchenCoords,
      rescueClock: clock,
      totalCandidatesEvaluated: candidates.length,
      eligibleMatchesCount: rankedResults.length,
      ineligibleCount: candidates.length - rankedResults.length,
      matches: rankedResults,
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred during match generation", 500);
  }
}
