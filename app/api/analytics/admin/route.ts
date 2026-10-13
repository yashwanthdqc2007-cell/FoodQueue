import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { analyticsQuerySchema, resolveDateRange } from "@/lib/validation/analytics";
import { getAdminAnalytics } from "@/lib/analytics/admin";
import type { ProfileModel } from "@/types/models";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verify Authentication
    const { data: userData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userData?.user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    // 2. Enforce Admin Role
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userData.user.id)
      .returns<ProfileModel[]>();

    const profile = profiles?.[0];

    if (profileErr || !profile || profile.role !== "admin") {
      return errorResponse("FORBIDDEN", "Administrator access required for system-wide analytics", 403);
    }

    // 3. Validate Query Parameters
    const url = new URL(request.url);
    const parsedQuery = analyticsQuerySchema.safeParse({
      period: url.searchParams.get("period") || undefined,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
    });

    if (!parsedQuery.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid query parameters", 400, parsedQuery.error.flatten());
    }

    const dateRange = resolveDateRange(parsedQuery.data);
    const summary = await getAdminAnalytics(supabase, dateRange, parsedQuery.data.period || "30d");

    return successResponse(summary, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error occurred";
    return errorResponse("INTERNAL_SERVER_ERROR", message, 500);
  }
}
