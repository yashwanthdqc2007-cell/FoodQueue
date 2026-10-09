import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { PickupRequestModel, ProfileModel, KitchenModel, ReceiverModel, SurplusItemModel } from "@/types/models";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: pickupId } = await params;
    if (!pickupId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pickupId)) {
      return errorResponse("VALIDATION_ERROR", "Invalid pickup UUID parameter", 400);
    }

    const supabase = await createClient();

    // 1. Authenticate user session
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    // 2. Fetch user profile
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, role, organization_id")
      .eq("id", userData.user.id)
      .returns<ProfileModel[]>();

    const profile = profiles?.[0];
    if (!profile) {
      return errorResponse("UNAUTHORIZED", "User profile not found", 401);
    }

    // 3. Fetch pickup record
    const { data: pickups, error: fetchError } = await supabase
      .from("pickup_requests")
      .select(`
        id,
        surplus_id,
        receiver_id,
        proof_image_path,
        surplus_items (
          id,
          kitchen_id,
          kitchens (
            id,
            organization_id
          )
        ),
        receivers (
          id,
          organization_id
        )
      `)
      .eq("id", pickupId)
      .returns<PickupRequestModel[]>();

    const pickup = pickups?.[0];
    if (fetchError || !pickup) {
      return errorResponse("NOT_FOUND", "Pickup request not found", 404);
    }

    if (!pickup.proof_image_path) {
      return errorResponse("NOT_FOUND", "No proof image recorded for this pickup", 404);
    }

    const surplus = pickup.surplus_items as (SurplusItemModel & {
      kitchens?: KitchenModel | null;
    }) | null;

    const receiver = pickup.receivers as ReceiverModel | null;

    const isAdmin = profile.role === "admin";
    const isKitchenOwner = profile.role === "kitchen" && profile.organization_id === surplus?.kitchens?.organization_id;
    const isReceiverOwner = profile.role === "receiver" && profile.organization_id === receiver?.organization_id;

    if (!isAdmin && !isKitchenOwner && !isReceiverOwner) {
      return errorResponse("FORBIDDEN", "Forbidden: You do not have permission to view this proof", 403);
    }

    // 4. Generate signed URL from private 'pickup-proofs' bucket
    const { data: signedData, error: signError } = await supabase.storage
      .from("pickup-proofs")
      .createSignedUrl(pickup.proof_image_path, 3600);

    if (signError || !signedData?.signedUrl) {
      return errorResponse("INTERNAL_SERVER_ERROR", "Failed to generate signed URL for proof", 500);
    }

    return successResponse({
      pickupId: pickup.id,
      proofImagePath: pickup.proof_image_path,
      signedUrl: signedData.signedUrl,
      expiresInSeconds: 3600,
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while retrieving proof URL", 500);
  }
}
