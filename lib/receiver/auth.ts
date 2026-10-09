import { createClient } from "@/lib/supabase/server";
import type { ProfileModel, ReceiverModel, OrganizationModel } from "@/types/models";

export interface ReceiverAuthResult {
  user: { id: string; email?: string } | null;
  profile: ProfileModel | null;
  receiver: ReceiverModel | null;
  organization: OrganizationModel | null;
  isAdmin: boolean;
  error: { code: string; message: string; status: number } | null;
}

/**
 * Authenticates caller and verifies 'receiver' (or 'admin') role authorization.
 * If targetReceiverId is provided, checks organization match for receiver role.
 */
export async function authenticateReceiverUser(
  targetReceiverId?: string
): Promise<ReceiverAuthResult> {
  const supabase = await createClient();

  // 1. Authenticate user session
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) {
    return {
      user: null,
      profile: null,
      receiver: null,
      organization: null,
      isAdmin: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required", status: 401 },
    };
  }

  const userId = userData.user.id;

  // 2. Fetch user profile
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      organization_id,
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
    .eq("id", userId)
    .returns<ProfileModel[]>();

  const profile = profiles?.[0];
  if (profileError || !profile) {
    return {
      user: userData.user,
      profile: null,
      receiver: null,
      organization: null,
      isAdmin: false,
      error: { code: "UNAUTHORIZED", message: "Profile not found", status: 401 },
    };
  }

  const isAdmin = profile.role === "admin";

  // Reject unauthorized roles
  if (profile.role !== "receiver" && !isAdmin) {
    return {
      user: userData.user,
      profile,
      receiver: null,
      organization: null,
      isAdmin: false,
      error: {
        code: "FORBIDDEN",
        message: "Forbidden: User lacks receiver role privileges",
        status: 403,
      },
    };
  }

  // Reject unassigned users without an organization
  if (!isAdmin && !profile.organization_id) {
    return {
      user: userData.user,
      profile,
      receiver: null,
      organization: null,
      isAdmin: false,
      error: {
        code: "FORBIDDEN",
        message: "Forbidden: Account pending organization assignment by administrator",
        status: 403,
      },
    };
  }

  // 3. Fetch linked receiver entity for this organization
  let receiverQuery = supabase
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
      updated_at
    `);

  if (!isAdmin && profile.organization_id) {
    receiverQuery = receiverQuery.eq("organization_id", profile.organization_id);
  } else if (targetReceiverId) {
    receiverQuery = receiverQuery.eq("id", targetReceiverId);
  }

  const { data: receivers } = await receiverQuery.returns<ReceiverModel[]>();
  const receiver = receivers?.[0] || null;

  // If a specific targetReceiverId was provided and caller is not admin, verify ownership
  if (!isAdmin && targetReceiverId && receiver && receiver.id !== targetReceiverId) {
    return {
      user: userData.user,
      profile,
      receiver,
      organization: profile.organizations || null,
      isAdmin: false,
      error: {
        code: "FORBIDDEN",
        message: "Forbidden: Receiver record does not belong to user organization",
        status: 403,
      },
    };
  }

  return {
    user: userData.user,
    profile,
    receiver,
    organization: profile.organizations || null,
    isAdmin,
    error: null,
  };
}
