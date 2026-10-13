import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { analyticsQuerySchema, resolveDateRange } from "@/lib/validation/analytics";
import { getReceiverAnalytics } from "@/lib/analytics/receiver";
import type { ProfileModel, ReceiverModel } from "@/types/models";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verify Authentication
    const { data: userData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userData?.user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    // 2. Fetch User Profile
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("id, role, organization_id")
      .eq("id", userData.user.id)
      .returns<ProfileModel[]>();

    const profile = profiles?.[0];

    if (profileErr || !profile) {
      return errorResponse("FORBIDDEN", "User profile not found", 403);
    }

    const isAdmin = profile.role === "admin";

    if (!isAdmin && profile.role !== "receiver") {
      return errorResponse("FORBIDDEN", "Receiver or administrator role required", 403);
    }

    if (!isAdmin && !profile.organization_id) {
      return errorResponse("FORBIDDEN", "User is not assigned to an active organization", 403);
    }

    // 3. Resolve Receiver ID
    let targetReceiverId: string | null = null;
    const url = new URL(request.url);
    const requestedReceiverId = url.searchParams.get("receiverId");

    if (requestedReceiverId) {
      let query = supabase
        .from("receivers")
        .select("id, organization_id, receiver_type, max_capacity, accepted_food_types, operating_hours, priority_level, verified, created_at, updated_at")
        .eq("id", requestedReceiverId);

      if (!isAdmin) {
        query = query.eq("organization_id", profile.organization_id!);
      }

      const { data: receivers, error: rErr } = await query.returns<ReceiverModel[]>();
      if (rErr || !receivers?.[0]) {
        return errorResponse("NOT_FOUND", "Receiver profile not found or access unauthorized", 404);
      }
      targetReceiverId = receivers[0].id;
    } else if (profile.organization_id) {
      const { data: receivers, error: rErr } = await supabase
        .from("receivers")
        .select("id, organization_id, receiver_type, max_capacity, accepted_food_types, operating_hours, priority_level, verified, created_at, updated_at")
        .eq("organization_id", profile.organization_id)
        .returns<ReceiverModel[]>();

      if (!rErr && receivers?.[0]) {
        targetReceiverId = receivers[0].id;
      }
    }

    // If still unresolved and caller is admin, resolve the primary receiver (consistent with Receiver layout)
    if (!targetReceiverId && isAdmin) {
      const { data: defaultReceivers } = await supabase
        .from("receivers")
        .select("id, organization_id, receiver_type, max_capacity, accepted_food_types, operating_hours, priority_level, verified, created_at, updated_at")
        .limit(1)
        .returns<ReceiverModel[]>();

      if (defaultReceivers?.[0]) {
        targetReceiverId = defaultReceivers[0].id;
      }
    }

    if (!targetReceiverId) {
      return errorResponse("NOT_FOUND", "No receiver profile found for this workspace", 404);
    }

    // 4. Validate Query Parameters
    const parsedQuery = analyticsQuerySchema.safeParse({
      period: url.searchParams.get("period") || undefined,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
    });

    if (!parsedQuery.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid query parameters", 400, parsedQuery.error.flatten());
    }

    const dateRange = resolveDateRange(parsedQuery.data);
    const summary = await getReceiverAnalytics(
      supabase,
      targetReceiverId,
      dateRange,
      parsedQuery.data.period || "30d"
    );

    return successResponse(summary, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error occurred";
    return errorResponse("INTERNAL_SERVER_ERROR", message, 500);
  }
}
