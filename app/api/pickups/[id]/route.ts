import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { updatePickupStatusSchema } from "@/lib/validation/pickup";
import { calculateRedistributionImpact } from "@/lib/rules/impact-calculator";
import { computeRescueClock } from "@/lib/rules/rescue-clock";
import type {
  PickupRequestModel,
  ProfileModel,
  KitchenModel,
  ReceiverModel,
  SurplusItemModel,
  OrganizationModel,
  ImpactRecordModel,
} from "@/types/models";

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

    // 1. Authenticate caller
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

    // 3. Fetch pickup record with full relations
    const { data: pickups, error: fetchError } = await supabase
      .from("pickup_requests")
      .select(`
        id,
        surplus_id,
        receiver_id,
        requested_at,
        scheduled_at,
        picked_up_at,
        status,
        proof_image_path,
        notes,
        surplus_items (
          id,
          kitchen_id,
          source_meal_id,
          food_name,
          quantity,
          unit,
          category,
          status,
          prepared_at,
          reported_at,
          redistribution_deadline,
          image_path,
          notes,
          kitchens (
            id,
            name,
            address,
            latitude,
            longitude,
            organizations (
              id,
              name,
              address,
              contact_phone
            )
          ),
          impact_records (
            id,
            food_saved_quantity,
            estimated_meals_saved,
            estimated_waste_diverted,
            estimated_co2e_avoided,
            estimated_value_saved,
            recorded_at
          )
        ),
        receivers (
          id,
          organization_id,
          receiver_type,
          max_capacity,
          organizations (
            id,
            name,
            address,
            contact_phone
          )
        )
      `)
      .eq("id", pickupId)
      .returns<PickupRequestModel[]>();

    const pickup = pickups?.[0];
    if (fetchError || !pickup) {
      return errorResponse("NOT_FOUND", "Pickup request not found", 404);
    }

    const surplus = pickup.surplus_items as (SurplusItemModel & {
      kitchens?: (KitchenModel & { organizations?: OrganizationModel | null }) | null;
      impact_records?: ImpactRecordModel[] | null;
    }) | null;

    const receiver = pickup.receivers as (ReceiverModel & {
      organizations?: OrganizationModel | null;
    }) | null;

    const kitchen = surplus?.kitchens;
    const kitchenOrg = kitchen?.organizations;
    const receiverOrg = receiver?.organizations;
    const impact = surplus?.impact_records?.[0] || null;

    // 4. Authorization check
    const isAdmin = profile.role === "admin";
    const isKitchenOwner = profile.role === "kitchen" && profile.organization_id === (kitchen?.organization_id || kitchenOrg?.id);
    const isReceiverOwner = profile.role === "receiver" && profile.organization_id === receiver?.organization_id;

    if (!isAdmin && !isKitchenOwner && !isReceiverOwner) {
      return errorResponse("FORBIDDEN", "Forbidden: You do not have permission to view this pickup", 403);
    }

    // 5. Generate signed proof image URL if proof exists
    let signedProofUrl: string | null = null;
    if (pickup.proof_image_path) {
      const { data: signedData } = await supabase.storage
        .from("pickup-proofs")
        .createSignedUrl(pickup.proof_image_path, 3600);
      signedProofUrl = signedData?.signedUrl || null;
    }

    let signedSurplusImageUrl: string | null = null;
    if (surplus?.image_path) {
      const { data: signedData } = await supabase.storage
        .from("food-images")
        .createSignedUrl(surplus.image_path, 3600);
      signedSurplusImageUrl = signedData?.signedUrl || null;
    }

    const clock = computeRescueClock(surplus?.redistribution_deadline);

    return successResponse({
      id: pickup.id,
      surplusId: pickup.surplus_id,
      receiverId: pickup.receiver_id,
      status: pickup.status,
      requestedAt: pickup.requested_at,
      scheduledAt: pickup.scheduled_at,
      pickedUpAt: pickup.picked_up_at,
      proofImagePath: pickup.proof_image_path,
      signedProofUrl,
      notes: pickup.notes,
      surplus: {
        id: surplus?.id || pickup.surplus_id,
        foodName: surplus?.food_name || "Food Batch",
        quantity: surplus?.quantity ? Number(surplus.quantity) : 0,
        unit: surplus?.unit || "kg",
        category: surplus?.category || "edible_surplus",
        status: surplus?.status || "matched",
        preparedAt: surplus?.prepared_at || null,
        reportedAt: surplus?.reported_at || pickup.requested_at,
        redistributionDeadline: surplus?.redistribution_deadline || null,
        signedImageUrl: signedSurplusImageUrl,
        notes: surplus?.notes || null,
        rescueClock: clock,
        kitchen: {
          id: kitchen?.id || null,
          name: kitchen?.name || kitchenOrg?.name || "Partner Kitchen",
          address: kitchen?.address || kitchenOrg?.address || "Address provided",
          contactPhone: kitchenOrg?.contact_phone || null,
          coordinates: kitchen?.latitude && kitchen?.longitude
            ? { latitude: Number(kitchen.latitude), longitude: Number(kitchen.longitude) }
            : null,
        },
      },
      receiver: {
        id: receiver?.id || pickup.receiver_id,
        name: receiverOrg?.name || "Community Partner",
        receiverType: receiver?.receiver_type || "ngo",
        address: receiverOrg?.address || null,
        contactPhone: receiverOrg?.contact_phone || null,
      },
      impact: impact ? {
        id: impact.id,
        foodSavedQuantity: Number(impact.food_saved_quantity),
        estimatedMealsSaved: Number(impact.estimated_meals_saved),
        estimatedWasteDiverted: Number(impact.estimated_waste_diverted),
        estimatedCo2eAvoided: impact.estimated_co2e_avoided ? Number(impact.estimated_co2e_avoided) : null,
        estimatedValueSaved: impact.estimated_value_saved ? Number(impact.estimated_value_saved) : null,
        recordedAt: impact.recorded_at,
      } : null,
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while fetching pickup details", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: pickupId } = await params;
    if (!pickupId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pickupId)) {
      return errorResponse("VALIDATION_ERROR", "Invalid pickup UUID parameter", 400);
    }

    const rawBody = await request.json();
    const parseResult = updatePickupStatusSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid pickup update payload", 400, parseResult.error.flatten());
    }

    const { status: targetStatus, scheduledAt, pickedUpAt, proofImagePath, notes } = parseResult.data;

    const supabase = await createClient();

    // 1. Authenticate caller
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

    // 3. Fetch existing pickup record with relationships
    const { data: pickups, error: fetchError } = await supabase
      .from("pickup_requests")
      .select(`
        id,
        surplus_id,
        receiver_id,
        status,
        requested_at,
        scheduled_at,
        picked_up_at,
        proof_image_path,
        notes,
        surplus_items (
          id,
          kitchen_id,
          food_name,
          quantity,
          unit,
          status,
          redistribution_deadline,
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

    const surplus = pickup.surplus_items as (SurplusItemModel & {
      kitchens?: KitchenModel | null;
    }) | null;

    const receiver = pickup.receivers as ReceiverModel | null;

    const isAdmin = profile.role === "admin";
    const isKitchenOwner = profile.role === "kitchen" && profile.organization_id === surplus?.kitchens?.organization_id;
    const isReceiverOwner = profile.role === "receiver" && profile.organization_id === receiver?.organization_id;

    if (!isAdmin && !isKitchenOwner && !isReceiverOwner) {
      return errorResponse("FORBIDDEN", "Forbidden: You are not authorized to update this pickup transaction", 403);
    }

    // 4. State Machine & Transition Rules
    const currentStatus = pickup.status;

    // Idempotent check: If already in target status, return 200 OK
    if (currentStatus === targetStatus) {
      return successResponse({
        id: pickup.id,
        status: currentStatus,
        message: `Pickup is already in '${targetStatus}' status (idempotent replay).`,
      });
    }

    // Guard: Terminal state transitions
    if (currentStatus === "picked_up" || currentStatus === "cancelled") {
      return errorResponse(
        "CONFLICT",
        `Cannot transition from terminal status '${currentStatus}' to '${targetStatus}'.`,
        409
      );
    }

    // Transition: scheduled
    if (targetStatus === "scheduled") {
      // Allowed from: 'requested'
      if (currentStatus !== "requested") {
        return errorResponse(
          "CONFLICT",
          `Invalid state transition: Cannot schedule pickup from status '${currentStatus}'.`,
          409
        );
      }

      // Kitchen or Admin can schedule
      if (!isAdmin && !isKitchenOwner) {
        return errorResponse(
          "FORBIDDEN",
          "Only the originating kitchen or administrator can confirm and schedule a pickup.",
          403
        );
      }

      const scheduledTimestamp = scheduledAt || new Date().toISOString();

      const { error: updateError } = await (supabase as any)
        .from("pickup_requests")
        .update({
          status: "scheduled",
          scheduled_at: scheduledTimestamp,
          notes: notes !== undefined ? notes : pickup.notes,
        })
        .eq("id", pickupId);

      if (updateError) {
        return errorResponse("INTERNAL_SERVER_ERROR", `Failed to schedule pickup: ${updateError.message}`, 500);
      }

      // Update surplus status to 'pickup_pending' (or keep 'matched')
      if (surplus?.id) {
        await (supabase as any)
          .from("surplus_items")
          .update({ status: "pickup_pending" })
          .eq("id", surplus.id);
      }

      return successResponse({
        id: pickup.id,
        status: "scheduled",
        scheduledAt: scheduledTimestamp,
        message: "Pickup request confirmed and scheduled successfully.",
      });
    }

    // Transition: picked_up (Completion)
    if (targetStatus === "picked_up") {
      // Allowed from: 'requested' or 'scheduled'
      if (currentStatus !== "requested" && currentStatus !== "scheduled") {
        return errorResponse(
          "CONFLICT",
          `Invalid state transition: Cannot complete pickup from status '${currentStatus}'.`,
          409
        );
      }

      // Receiver or Admin can complete collection
      if (!isAdmin && !isReceiverOwner) {
        return errorResponse(
          "FORBIDDEN",
          "Only the recipient receiver organization or administrator can confirm pickup collection.",
          403
        );
      }

      const completedTimestamp = pickedUpAt || new Date().toISOString();
      const finalProofPath = proofImagePath !== undefined ? proofImagePath : pickup.proof_image_path;

      // Update pickup request
      const { error: updateError } = await (supabase as any)
        .from("pickup_requests")
        .update({
          status: "picked_up",
          picked_up_at: completedTimestamp,
          proof_image_path: finalProofPath,
          notes: notes !== undefined ? notes : pickup.notes,
        })
        .eq("id", pickupId);

      if (updateError) {
        return errorResponse("INTERNAL_SERVER_ERROR", `Failed to complete pickup: ${updateError.message}`, 500);
      }

      // Update surplus status -> 'picked_up'
      if (surplus?.id) {
        await (supabase as any)
          .from("surplus_items")
          .update({ status: "picked_up" })
          .eq("id", surplus.id);

        // Record impact metrics idempotently (check if impact record already exists for this surplus)
        const { data: existingImpact } = await supabase
          .from("impact_records")
          .select("id")
          .eq("surplus_id", surplus.id)
          .returns<ImpactRecordModel[]>();

        if (!existingImpact || existingImpact.length === 0) {
          const metrics = calculateRedistributionImpact({
            quantity: Number(surplus.quantity),
            unit: surplus.unit,
          });

          await (supabase as any)
            .from("impact_records")
            .insert({
              surplus_id: surplus.id,
              food_saved_quantity: metrics.foodSavedQuantity,
              estimated_meals_saved: metrics.estimatedMealsSaved,
              estimated_waste_diverted: metrics.estimatedWasteDiverted,
              estimated_co2e_avoided: metrics.estimatedCo2eAvoided,
              estimated_value_saved: metrics.estimatedValueSaved,
              recorded_at: completedTimestamp,
            });
        }
      }

      return successResponse({
        id: pickup.id,
        status: "picked_up",
        pickedUpAt: completedTimestamp,
        proofImagePath: finalProofPath,
        message: "Pickup completed successfully. Redistribution impact recorded.",
      });
    }

    // Transition: cancelled
    if (targetStatus === "cancelled") {
      // Allowed from: 'requested' or 'scheduled'
      if (currentStatus !== "requested" && currentStatus !== "scheduled") {
        return errorResponse(
          "CONFLICT",
          `Cannot cancel pickup in '${currentStatus}' status.`,
          409
        );
      }

      const { error: updateError } = await (supabase as any)
        .from("pickup_requests")
        .update({
          status: "cancelled",
          notes: notes ? `${pickup.notes ? pickup.notes + " | " : ""}Cancelled: ${notes}` : pickup.notes,
        })
        .eq("id", pickupId);

      if (updateError) {
        return errorResponse("INTERNAL_SERVER_ERROR", `Failed to cancel pickup: ${updateError.message}`, 500);
      }

      // Revert surplus state if active/unexpired
      if (surplus?.id) {
        const clock = computeRescueClock(surplus.redistribution_deadline);
        const restoredStatus = clock.isExpired ? "expired" : "active";

        await (supabase as any)
          .from("surplus_items")
          .update({ status: restoredStatus })
          .eq("id", surplus.id);

        // Update match status to rejected
        await (supabase as any)
          .from("redistribution_matches")
          .update({ status: "rejected" })
          .eq("surplus_id", surplus.id)
          .eq("receiver_id", pickup.receiver_id);
      }

      return successResponse({
        id: pickup.id,
        status: "cancelled",
        message: "Pickup transaction cancelled successfully.",
      });
    }

    return errorResponse("BAD_REQUEST", `Unsupported target status: ${targetStatus}`, 400);
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while updating pickup status", 500);
  }
}
