import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { authenticateReceiverUser } from "@/lib/receiver/auth";
import { computeRescueClock } from "@/lib/rules/rescue-clock";
import type { RedistributionMatchModel, SurplusItemModel, ReceiverModel, PickupRequestModel } from "@/types/models";

interface RouteParams {
  params: Promise<{ matchId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { matchId } = await params;
    if (!matchId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchId)) {
      return errorResponse("VALIDATION_ERROR", "Invalid match UUID parameter", 400);
    }

    const rawBody = await request.json().catch(() => ({}));
    const notes = typeof rawBody?.notes === "string" ? rawBody.notes.slice(0, 500) : undefined;

    const supabase = await createClient();

    // 1. Fetch match record with surplus and receiver details
    const { data: matches, error: fetchError } = await supabase
      .from("redistribution_matches")
      .select(`
        id,
        surplus_id,
        receiver_id,
        match_score,
        status,
        created_at,
        surplus_items (
          id,
          kitchen_id,
          food_name,
          quantity,
          unit,
          status,
          redistribution_deadline
        ),
        receivers (
          id,
          organization_id
        )
      `)
      .eq("id", matchId)
      .returns<RedistributionMatchModel[]>();

    const match = matches?.[0];
    if (fetchError || !match) {
      return errorResponse("NOT_FOUND", "Target redistribution match not found", 404);
    }

    const surplus = match.surplus_items as SurplusItemModel | null;
    const receiver = match.receivers as ReceiverModel | null;

    if (!surplus || !receiver) {
      return errorResponse("INTERNAL_SERVER_ERROR", "Incomplete match relationship data", 500);
    }

    // 2. Authorize caller for this receiver entity
    const authResult = await authenticateReceiverUser(receiver.id);
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    // 3. Verify match state is 'recommended'
    if (match.status !== "recommended") {
      return errorResponse(
        "CONFLICT",
        `Match cannot be accepted because current status is '${match.status}'.`,
        409
      );
    }

    // 4. Verify surplus state is 'active' and not expired
    if (surplus.status !== "active") {
      return errorResponse(
        "CONFLICT",
        `Surplus item is no longer available (current status: '${surplus.status}').`,
        409
      );
    }

    const clock = computeRescueClock(surplus.redistribution_deadline);
    if (clock.isExpired) {
      return errorResponse(
        "UNPROCESSABLE_ENTITY",
        "Cannot accept match: Redistribution deadline has expired.",
        422
      );
    }

    // 5. Atomic state update:
    // Update match -> 'accepted'
    const { error: matchUpdateError } = await (supabase as any)
      .from("redistribution_matches")
      .update({ status: "accepted" })
      .eq("id", matchId);

    if (matchUpdateError) {
      return errorResponse(
        "INTERNAL_SERVER_ERROR",
        `Failed to update match status: ${matchUpdateError.message}`,
        500
      );
    }

    // Update surplus -> 'matched'
    const { error: surplusUpdateError } = await (supabase as any)
      .from("surplus_items")
      .update({ status: "matched" })
      .eq("id", surplus.id);

    if (surplusUpdateError) {
      console.error("Surplus status update error:", surplusUpdateError);
    }

    // Create pickup_request -> status: 'requested'
    const { data: pickupRecords, error: pickupError } = await (supabase as any)
      .from("pickup_requests")
      .insert({
        surplus_id: surplus.id,
        receiver_id: receiver.id,
        status: "requested",
        notes: notes || "Auto-generated pickup request from accepted match",
      })
      .select("id, status, requested_at");

    const pickup = (pickupRecords as PickupRequestModel[])?.[0];

    return successResponse({
      matchId: match.id,
      surplusId: surplus.id,
      receiverId: receiver.id,
      status: "accepted",
      pickupRequestId: pickup?.id || null,
      message: "Redistribution match successfully accepted. Pickup request created.",
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while accepting match", 500);
  }
}
