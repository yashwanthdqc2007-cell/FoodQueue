import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { authenticateReceiverUser } from "@/lib/receiver/auth";
import type { RedistributionMatchModel, ReceiverModel } from "@/types/models";

interface RouteParams {
  params: Promise<{ matchId: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { matchId } = await params;
    if (!matchId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchId)) {
      return errorResponse("VALIDATION_ERROR", "Invalid match UUID parameter", 400);
    }

    const supabase = await createClient();

    // 1. Fetch match to verify existence and receiver ownership
    const { data: matches, error: fetchError } = await supabase
      .from("redistribution_matches")
      .select(`
        id,
        surplus_id,
        receiver_id,
        status,
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

    const receiver = match.receivers as ReceiverModel | null;
    if (!receiver) {
      return errorResponse("INTERNAL_SERVER_ERROR", "Receiver record unavailable", 500);
    }

    // 2. Authorize caller for this receiver
    const authResult = await authenticateReceiverUser(receiver.id);
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    // 3. Update match to 'rejected'
    const { error: updateError } = await (supabase as any)
      .from("redistribution_matches")
      .update({ status: "rejected" })
      .eq("id", matchId);

    if (updateError) {
      return errorResponse(
        "INTERNAL_SERVER_ERROR",
        `Failed to update match status: ${updateError.message}`,
        500
      );
    }

    return successResponse({
      matchId: match.id,
      surplusId: match.surplus_id,
      status: "rejected",
      message: "Redistribution match recommendation declined.",
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while rejecting match", 500);
  }
}
