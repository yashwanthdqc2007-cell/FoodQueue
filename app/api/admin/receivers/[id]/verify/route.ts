import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { Database } from "@/types/database.types";
import type { ReceiverModel } from "@/types/models";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const verifyReceiverSchema = z.object({
  verified: z.boolean({ required_error: "verified boolean status is required" }),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: receiverId } = await params;

  if (!z.string().uuid().safeParse(receiverId).success) {
    return errorResponse("VALIDATION_ERROR", "Invalid receiver ID format", 400);
  }

  const supabase = await createClient();

  // 1. Verify caller session
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) {
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
    return errorResponse("FORBIDDEN", "Admin privileges required to verify receivers", 403);
  }

  // 3. Validate request payload
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid JSON payload in request body", 400);
  }

  const parsed = verifyReceiverSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Request body failed validation", 400, parsed.error.flatten().fieldErrors);
  }

  const { verified } = parsed.data;
  const adminClient = createAdminClient();

  // 4. Update receiver verification
  const { data: updatedReceivers, error: updateError } = await adminClient
    .from("receivers")
    .update({ verified })
    .eq("id", receiverId)
    .select(`
      id,
      organization_id,
      receiver_type,
      max_capacity,
      priority_level,
      verified,
      updated_at,
      organizations (
        id,
        name
      )
    `)
    .returns<ReceiverModel[]>();

  const updatedReceiver = updatedReceivers?.[0];

  if (updateError || !updatedReceiver) {
    return errorResponse("NOT_FOUND", updateError?.message || "Receiver not found", 404);
  }

  return successResponse({
    receiverId: updatedReceiver.id,
    organizationId: updatedReceiver.organization_id,
    organizationName: updatedReceiver.organizations?.name || "Partner",
    verified: updatedReceiver.verified,
    updatedAt: updatedReceiver.updated_at,
  });
}
