import { createClient } from "@/lib/supabase/server";
import type { ProfileModel, KitchenModel } from "@/types/models";

export interface AuthSuccess {
  user: { id: string; email?: string | null };
  profile: ProfileModel;
  kitchen?: KitchenModel | null;
  isAdmin: boolean;
}

export interface AuthFailure {
  error: {
    code: string;
    message: string;
    status: number;
  };
}

export type KitchenAuthResult = (AuthSuccess & { error?: never }) | (AuthFailure & { user?: never; profile?: never });

/**
 * Validates caller session, verifies kitchen/admin role, and verifies kitchen ownership.
 *
 * @param targetKitchenId Optional specific kitchen UUID to verify access for.
 */
export async function authenticateKitchenUser(targetKitchenId?: string): Promise<KitchenAuthResult> {
  const supabase = await createClient();

  // 1. Verify caller session
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) {
    return {
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authentication session",
        status: 401,
      },
    };
  }

  const user = userData.user;

  // 2. Fetch user profile
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      phone,
      role,
      organization_id,
      created_at,
      updated_at
    `)
    .eq("id", user.id)
    .returns<ProfileModel[]>();

  const profile = profiles?.[0];
  if (profileError || !profile) {
    return {
      error: {
        code: "UNAUTHORIZED",
        message: "User profile record not found",
        status: 401,
      },
    };
  }

  const isAdmin = profile.role === "admin";

  // 3. Reject receiver role
  if (profile.role === "receiver") {
    return {
      error: {
        code: "FORBIDDEN",
        message: "Receiver users are not permitted to access kitchen operations",
        status: 403,
      },
    };
  }

  // 4. Reject unassigned users (unless admin)
  if (!isAdmin && !profile.organization_id) {
    return {
      error: {
        code: "FORBIDDEN",
        message: "User is pending organization assignment and cannot operate kitchens",
        status: 403,
      },
    };
  }

  // 5. If specific targetKitchenId is provided, verify ownership
  let targetKitchen: KitchenModel | null = null;
  if (targetKitchenId) {
    let query = supabase
      .from("kitchens")
      .select("id, organization_id, name, address, latitude, longitude, timezone, active, created_at, updated_at")
      .eq("id", targetKitchenId);

    if (!isAdmin) {
      query = query.eq("organization_id", profile.organization_id!);
    }

    const { data: kitchens, error: kitchenError } = await query.returns<KitchenModel[]>();
    targetKitchen = kitchens?.[0] || null;

    if (kitchenError || !targetKitchen) {
      return {
        error: {
          code: "FORBIDDEN",
          message: "Kitchen not found or you do not have permission to access it",
          status: 403,
        },
      };
    }
  } else if (!isAdmin && profile.organization_id) {
    // If no kitchen specified, fetch caller's first active kitchen
    const { data: kitchens } = await supabase
      .from("kitchens")
      .select("id, organization_id, name, address, latitude, longitude, timezone, active, created_at, updated_at")
      .eq("organization_id", profile.organization_id)
      .eq("active", true)
      .returns<KitchenModel[]>();

    targetKitchen = kitchens?.[0] || null;
  }

  return {
    user: { id: user.id, email: user.email },
    profile,
    kitchen: targetKitchen,
    isAdmin,
  };
}
