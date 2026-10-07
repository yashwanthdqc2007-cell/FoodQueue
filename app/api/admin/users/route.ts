import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { Database } from "@/types/database.types";
import type { AdminUserListItem, ProfileModel } from "@/types/models";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // 1. Verify caller session
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) {
    return errorResponse("UNAUTHORIZED", "Missing or invalid authentication session", 401);
  }

  // 2. Verify caller role is admin
  const { data: callerProfiles, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .returns<Pick<ProfileRow, "role">[]>();

  const callerProfile = callerProfiles?.[0];

  if (profileError || callerProfile?.role !== "admin") {
    return errorResponse("FORBIDDEN", "Admin privileges required to view user directory", 403);
  }

  // 3. Query parameters for filtering
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const organizationId = searchParams.get("organizationId");
  const unassignedOnly = searchParams.get("unassignedOnly") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const adminClient = createAdminClient();
  let query = adminClient
    .from("profiles")
    .select(
      `
      id,
      full_name,
      email,
      phone,
      role,
      organization_id,
      created_at,
      updated_at,
      organizations (
        id,
        name,
        organization_type
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (role) {
    query = query.eq("role", role as "kitchen" | "receiver" | "admin");
  }

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  if (unassignedOnly) {
    query = query.is("organization_id", null);
  }

  const { data: users, count, error: listError } = await query.returns<ProfileModel[]>();

  if (listError) {
    return errorResponse("INTERNAL_SERVER_ERROR", listError.message || "Failed to list users", 500);
  }

  const formattedUsers: AdminUserListItem[] = (users || []).map((u) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    organizationId: u.organization_id,
    organizationName: u.organizations?.name || null,
    organizationType: u.organizations?.organization_type || null,
    status: u.organization_id ? "assigned" : "pending_organization_assignment",
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  }));

  return successResponse({
    users: formattedUsers,
    total: count ?? formattedUsers.length,
    limit,
    offset,
  });
}
