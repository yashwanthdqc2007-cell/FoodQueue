import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createOrganizationSchema } from "@/lib/validation/admin";
import type { Database } from "@/types/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type OrgRow = Database["public"]["Tables"]["organizations"]["Row"];
type KitchenRow = Database["public"]["Tables"]["kitchens"]["Row"];
type ReceiverRow = Database["public"]["Tables"]["receivers"]["Row"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1. Verify authenticated caller
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
    return errorResponse("FORBIDDEN", "Admin privileges required to create organizations", 403);
  }

  // 3. Validate request payload with Zod
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid JSON payload in request body", 400);
  }

  const parsed = createOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Request body failed validation",
      400,
      parsed.error.flatten().fieldErrors
    );
  }

  const { name, organizationType, address, latitude, longitude, contactPhone, kitchen, receiver } = parsed.data;

  // 4. Perform privileged insertion using trusted admin client
  const adminClient = createAdminClient();

  const { data: orgDataList, error: orgError } = await adminClient
    .from("organizations")
    .insert({
      name,
      organization_type: organizationType,
      address: address || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      contact_phone: contactPhone || null,
    })
    .select()
    .returns<OrgRow[]>();

  const orgData = orgDataList?.[0];

  if (orgError || !orgData) {
    return errorResponse("INTERNAL_SERVER_ERROR", orgError?.message || "Failed to create organization", 500);
  }

  let entityId: string | null = null;

  // Optional: provision linked kitchen entity
  if (organizationType === "kitchen" && kitchen) {
    const { data: kitchenDataList } = await adminClient
      .from("kitchens")
      .insert({
        organization_id: orgData.id,
        name: kitchen.name,
        timezone: kitchen.timezone || "Asia/Kolkata",
        address: address || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      })
      .select("id")
      .returns<Pick<KitchenRow, "id">[]>();

    if (kitchenDataList?.[0]) {
      entityId = kitchenDataList[0].id;
    }
  }

  // Optional: provision linked receiver entity
  if ((organizationType === "receiver" || organizationType === "ngo") && receiver) {
    const { data: receiverDataList } = await adminClient
      .from("receivers")
      .insert({
        organization_id: orgData.id,
        receiver_type: receiver.receiverType,
        max_capacity: receiver.maxCapacity,
        accepted_food_types: receiver.acceptedFoodTypes,
        operating_hours: receiver.operatingHours,
      })
      .select("id")
      .returns<Pick<ReceiverRow, "id">[]>();

    if (receiverDataList?.[0]) {
      entityId = receiverDataList[0].id;
    }
  }

  return successResponse(
    {
      organizationId: orgData.id,
      name: orgData.name,
      organizationType: orgData.organization_type,
      entityId,
      createdAt: orgData.created_at,
    },
    201
  );
}
