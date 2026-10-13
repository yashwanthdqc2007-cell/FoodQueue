import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { analyticsQuerySchema, resolveDateRange } from "@/lib/validation/analytics";
import { getKitchenAnalytics } from "@/lib/analytics/kitchen";
import type { ProfileModel, KitchenModel } from "@/types/models";

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

    if (!isAdmin && profile.role !== "kitchen") {
      return errorResponse("FORBIDDEN", "Only kitchen staff or administrators can access kitchen analytics", 403);
    }

    if (!isAdmin && !profile.organization_id) {
      return errorResponse("FORBIDDEN", "User is not assigned to an active organization", 403);
    }

    // 3. Resolve Kitchen ID
    let targetKitchenId: string | null = null;
    const url = new URL(request.url);
    const requestedKitchenId = url.searchParams.get("kitchenId");

    if (requestedKitchenId) {
      let query = supabase
        .from("kitchens")
        .select("id, organization_id, name, address, timezone, active")
        .eq("id", requestedKitchenId);

      if (!isAdmin) {
        query = query.eq("organization_id", profile.organization_id!);
      }

      const { data: kitchens, error: kErr } = await query.returns<KitchenModel[]>();
      if (kErr || !kitchens?.[0]) {
        return errorResponse("NOT_FOUND", "Kitchen not found or you do not have permission to access it", 404);
      }
      targetKitchenId = kitchens[0].id;
    } else if (profile.organization_id) {
      // Find kitchen for caller's organization
      const { data: kitchens, error: kErr } = await supabase
        .from("kitchens")
        .select("id, organization_id, name, address, timezone, active")
        .eq("organization_id", profile.organization_id)
        .eq("active", true)
        .returns<KitchenModel[]>();

      if (!kErr && kitchens?.[0]) {
        targetKitchenId = kitchens[0].id;
      }
    }

    // If still unresolved and caller is admin, resolve the primary active kitchen (matching Kitchen Dashboard)
    if (!targetKitchenId && isAdmin) {
      const { data: defaultKitchens } = await supabase
        .from("kitchens")
        .select("id, organization_id, name, address, timezone, active")
        .eq("active", true)
        .limit(1)
        .returns<KitchenModel[]>();

      if (defaultKitchens?.[0]) {
        targetKitchenId = defaultKitchens[0].id;
      }
    }

    if (!targetKitchenId) {
      return errorResponse("NOT_FOUND", "No active kitchen found for this workspace", 404);
    }

    // 4. Validate Query Parameters
    const parsedQuery = analyticsQuerySchema.safeParse({
      period: url.searchParams.get("period") || undefined,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
      kitchenId: targetKitchenId,
    });

    if (!parsedQuery.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid analytics query parameters", 400, parsedQuery.error.flatten());
    }

    const dateRange = resolveDateRange(parsedQuery.data);
    const summary = await getKitchenAnalytics(
      supabase,
      targetKitchenId,
      dateRange,
      parsedQuery.data.period || "30d"
    );

    return successResponse(summary, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error occurred";
    return errorResponse("INTERNAL_SERVER_ERROR", message, 500);
  }
}
