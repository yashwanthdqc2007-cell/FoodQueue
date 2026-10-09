import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createPickupSchema, pickupQuerySchema } from "@/lib/validation/pickup";
import type {
  PickupRequestModel,
  ProfileModel,
  KitchenModel,
  ReceiverModel,
  SurplusItemModel,
  OrganizationModel,
  ImpactRecordModel,
} from "@/types/models";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parseResult = pickupQuerySchema.safeParse({
      status: searchParams.get("status") || undefined,
      surplusId: searchParams.get("surplusId") || undefined,
      receiverId: searchParams.get("receiverId") || undefined,
      kitchenId: searchParams.get("kitchenId") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    });

    if (!parseResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid query parameters", 400, parseResult.error.flatten());
    }

    const { status, surplusId, receiverId, kitchenId, limit, offset } = parseResult.data;

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

    const isAdmin = profile.role === "admin";
    const isKitchen = profile.role === "kitchen";
    const isReceiver = profile.role === "receiver";

    if (!isAdmin && !profile.organization_id) {
      return errorResponse("FORBIDDEN", "Forbidden: Account pending organization assignment", 403);
    }

    // 3. Build query based on role scoping
    let query = supabase
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
          food_name,
          quantity,
          unit,
          category,
          status,
          redistribution_deadline,
          image_path,
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
      `, { count: "exact" });

    if (status) {
      query = query.eq("status", status);
    }
    if (surplusId) {
      query = query.eq("surplus_id", surplusId);
    }
    if (receiverId) {
      query = query.eq("receiver_id", receiverId);
    }

    // Role-specific scoping:
    if (isReceiver && !isAdmin) {
      // Find receiver entity ID for caller's organization
      const { data: receiverList } = await supabase
        .from("receivers")
        .select("id")
        .eq("organization_id", profile.organization_id!)
        .returns<ReceiverModel[]>();

      const callerReceiverId = receiverList?.[0]?.id;
      if (!callerReceiverId) {
        return successResponse({ pickups: [], total: 0, limit, offset });
      }
      query = query.eq("receiver_id", callerReceiverId);
    }

    query = query.order("requested_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data: rows, error: queryError, count } = await query.returns<PickupRequestModel[]>();

    if (queryError) {
      return errorResponse("INTERNAL_SERVER_ERROR", "Failed to retrieve pickups", 500);
    }

    // Filter kitchen-owned pickups in-memory if caller is kitchen
    let filteredRows = rows || [];
    if (isKitchen && !isAdmin) {
      filteredRows = filteredRows.filter((row) => {
        const surplus = row.surplus_items as (SurplusItemModel & {
          kitchens?: (KitchenModel & { organizations?: OrganizationModel | null }) | null;
        }) | null;
        const kitchenOrgId = surplus?.kitchens?.organization_id || surplus?.kitchens?.organizations?.id;
        return kitchenOrgId === profile.organization_id;
      });
    }

    // Generate signed URLs for pickup proofs if present
    const formatted = await Promise.all(
      filteredRows.map(async (p) => {
        const surplus = p.surplus_items as (SurplusItemModel & {
          kitchens?: (KitchenModel & { organizations?: OrganizationModel | null }) | null;
          impact_records?: ImpactRecordModel[] | null;
        }) | null;

        const receiver = p.receivers as (ReceiverModel & {
          organizations?: OrganizationModel | null;
        }) | null;

        const kitchen = surplus?.kitchens;
        const kitchenOrg = kitchen?.organizations;
        const receiverOrg = receiver?.organizations;
        const impact = surplus?.impact_records?.[0] || null;

        let signedProofUrl: string | null = null;
        if (p.proof_image_path) {
          const { data: signedData } = await supabase.storage
            .from("pickup-proofs")
            .createSignedUrl(p.proof_image_path, 3600);
          signedProofUrl = signedData?.signedUrl || null;
        }

        return {
          id: p.id,
          surplusId: p.surplus_id,
          receiverId: p.receiver_id,
          status: p.status,
          requestedAt: p.requested_at,
          scheduledAt: p.scheduled_at,
          pickedUpAt: p.picked_up_at,
          proofImagePath: p.proof_image_path,
          signedProofUrl,
          notes: p.notes,
          surplus: {
            id: surplus?.id || p.surplus_id,
            foodName: surplus?.food_name || "Food Batch",
            quantity: surplus?.quantity ? Number(surplus.quantity) : 0,
            unit: surplus?.unit || "kg",
            category: surplus?.category || "edible_surplus",
            status: surplus?.status || "matched",
            redistributionDeadline: surplus?.redistribution_deadline || null,
            kitchen: {
              id: kitchen?.id || null,
              name: kitchen?.name || kitchenOrg?.name || "Kitchen Partner",
              address: kitchen?.address || kitchenOrg?.address || "Address provided",
              contactPhone: kitchenOrg?.contact_phone || null,
              coordinates: kitchen?.latitude && kitchen?.longitude
                ? { latitude: Number(kitchen.latitude), longitude: Number(kitchen.longitude) }
                : null,
            },
          },
          receiver: {
            id: receiver?.id || p.receiver_id,
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
        };
      })
    );

    return successResponse({
      pickups: formatted,
      total: count ?? formatted.length,
      limit,
      offset,
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while listing pickups", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parseResult = createPickupSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid pickup creation payload", 400, parseResult.error.flatten());
    }

    const { surplusId, receiverId, scheduledAt, notes } = parseResult.data;

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
      return errorResponse("UNAUTHORIZED", "Profile not found", 401);
    }

    // 3. Fetch surplus and receiver to verify authorization
    const { data: surplusList } = await supabase
      .from("surplus_items")
      .select(`
        id,
        kitchen_id,
        status,
        quantity,
        unit,
        kitchens (
          id,
          organization_id
        )
      `)
      .eq("id", surplusId)
      .returns<SurplusItemModel[]>();

    const surplus = surplusList?.[0];
    if (!surplus) {
      return errorResponse("NOT_FOUND", "Surplus item not found", 404);
    }

    const { data: receiverList } = await supabase
      .from("receivers")
      .select("id, organization_id")
      .eq("id", receiverId)
      .returns<ReceiverModel[]>();

    const receiver = receiverList?.[0];
    if (!receiver) {
      return errorResponse("NOT_FOUND", "Receiver not found", 404);
    }

    const isAdmin = profile.role === "admin";
    const isKitchenOwner = profile.role === "kitchen" && profile.organization_id === (surplus.kitchens as KitchenModel)?.organization_id;
    const isReceiverOwner = profile.role === "receiver" && profile.organization_id === receiver.organization_id;

    if (!isAdmin && !isKitchenOwner && !isReceiverOwner) {
      return errorResponse("FORBIDDEN", "Forbidden: You are not authorized to create a pickup for this transaction", 403);
    }

    // 4. Check for existing pickup request (Idempotency)
    const { data: existingPickups } = await supabase
      .from("pickup_requests")
      .select("id, surplus_id, receiver_id, status, requested_at, scheduled_at, notes")
      .eq("surplus_id", surplusId)
      .eq("receiver_id", receiverId)
      .returns<PickupRequestModel[]>();

    if (existingPickups && existingPickups.length > 0) {
      const existing = existingPickups[0];
      return successResponse({
        pickup: existing,
        message: "Existing pickup transaction returned (idempotent replay).",
      });
    }

    // 5. Create new pickup request
    const initialStatus = scheduledAt ? "scheduled" : "requested";
    const { data: inserted, error: insertError } = await (supabase as any)
      .from("pickup_requests")
      .insert({
        surplus_id: surplusId,
        receiver_id: receiverId,
        status: initialStatus,
        scheduled_at: scheduledAt || null,
        notes: notes || "Direct pickup request",
      })
      .select("id, surplus_id, receiver_id, status, requested_at, scheduled_at, notes");

    if (insertError) {
      return errorResponse("INTERNAL_SERVER_ERROR", `Failed to create pickup request: ${insertError.message}`, 500);
    }

    const newPickup = (inserted as PickupRequestModel[])?.[0];

    return successResponse(
      {
        pickup: newPickup,
        message: "Pickup request successfully initiated.",
      },
      201
    );
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while creating pickup", 500);
  }
}
