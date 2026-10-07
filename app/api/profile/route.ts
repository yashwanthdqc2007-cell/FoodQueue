import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { ProfileModel, UserProfileResponse } from "@/types/models";

export async function GET() {
  const supabase = await createClient();

  // 1. Verify caller identity using recommended server-side getUser()
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData.user) {
    return errorResponse(
      "UNAUTHORIZED",
      "Missing or invalid authentication session",
      401
    );
  }

  const user = userData.user;

  // 2. Fetch profile from public.profiles under RLS
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
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
        organization_type,
        address,
        latitude,
        longitude,
        contact_phone
      )
    `)
    .eq("id", user.id)
    .returns<ProfileModel[]>();

  const currentProfile = profile?.[0];

  if (profileError || !currentProfile) {
    return errorResponse(
      "NOT_FOUND",
      "User profile record not found",
      404
    );
  }

  // 3. Format clean user & profile data
  const responseData: UserProfileResponse = {
    user: {
      id: user.id,
      email: user.email,
      fullName: currentProfile.full_name,
    },
    profile: {
      id: currentProfile.id,
      fullName: currentProfile.full_name,
      email: currentProfile.email,
      phone: currentProfile.phone,
      role: currentProfile.role,
      organizationId: currentProfile.organization_id,
      status: currentProfile.organization_id ? "assigned" : "pending_organization_assignment",
      organization: currentProfile.organizations || null,
      createdAt: currentProfile.created_at,
      updatedAt: currentProfile.updated_at,
    },
  };

  return successResponse(responseData);
}
