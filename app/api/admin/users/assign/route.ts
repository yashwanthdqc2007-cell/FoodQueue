import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { assignUserSchema } from "@/lib/validation/admin";
import type { Database } from "@/types/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type OrgRow = Database["public"]["Tables"]["organizations"]["Row"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1. Authenticate caller session via Supabase Auth
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) {
    return errorResponse("UNAUTHORIZED", "Missing or invalid authentication session", 401);
  }

  // 2. Verify caller's profile role is admin
  const { data: callerProfiles, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .returns<Pick<ProfileRow, "role">[]>();

  const callerProfile = callerProfiles?.[0];

  if (profileError || callerProfile?.role !== "admin") {
    return errorResponse("FORBIDDEN", "Admin privileges required to assign users", 403);
  }

  // 3. Validate request payload with Zod
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid JSON payload in request body", 400);
  }

  const parsed = assignUserSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Request body failed validation",
      400,
      parsed.error.flatten().fieldErrors
    );
  }

  const { userId, organizationId, role } = parsed.data;
  const adminClient = createAdminClient();

  // 4. Verify target user exists
  const { data: targetUsers, error: targetUserError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .returns<Pick<ProfileRow, "id">[]>();

  const targetUser = targetUsers?.[0];

  if (targetUserError || !targetUser) {
    return errorResponse("NOT_FOUND", "Target user profile does not exist", 404);
  }

  // 5. Verify target organization exists
  const { data: targetOrgs, error: targetOrgError } = await adminClient
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .returns<Pick<OrgRow, "id" | "name">[]>();

  const targetOrg = targetOrgs?.[0];

  if (targetOrgError || !targetOrg) {
    return errorResponse("NOT_FOUND", "Target organization does not exist", 404);
  }

  // 6. Perform privileged update on trusted server
  const { data: updatedProfiles, error: updateError } = await adminClient
    .from("profiles")
    .update({
      organization_id: organizationId,
      role: role,
    })
    .eq("id", userId)
    .select("id, full_name, email, role, organization_id, updated_at")
    .returns<Pick<ProfileRow, "id" | "full_name" | "email" | "role" | "organization_id" | "updated_at">[]>();

  const updatedProfile = updatedProfiles?.[0];

  if (updateError || !updatedProfile) {
    return errorResponse("INTERNAL_SERVER_ERROR", updateError?.message || "Failed to update user profile", 500);
  }

  return successResponse({
    userId: updatedProfile.id,
    fullName: updatedProfile.full_name,
    email: updatedProfile.email,
    organizationId: updatedProfile.organization_id,
    organizationName: targetOrg.name,
    role: updatedProfile.role,
    updatedAt: updatedProfile.updated_at,
  });
}
