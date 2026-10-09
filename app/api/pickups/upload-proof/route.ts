import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { PickupRequestModel, ProfileModel, ReceiverModel } from "@/types/models";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user session
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, role, organization_id")
      .eq("id", userData.user.id)
      .returns<ProfileModel[]>();

    const profile = profiles?.[0];
    if (!profile) {
      return errorResponse("UNAUTHORIZED", "User profile not found", 401);
    }

    // 2. Read multipart form data
    const formData = await request.formData();
    const pickupId = formData.get("pickupId") as string | null;
    const file = formData.get("file") as File | null;

    if (!pickupId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pickupId)) {
      return errorResponse("VALIDATION_ERROR", "Invalid or missing pickupId", 400);
    }

    if (!file) {
      return errorResponse("VALIDATION_ERROR", "Missing proof image file", 400);
    }

    // 3. Validate MIME type & file size
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return errorResponse(
        "VALIDATION_ERROR",
        `Invalid file format '${file.type}'. Allowed formats: JPEG, PNG, WebP.`,
        400
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return errorResponse(
        "VALIDATION_ERROR",
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed 5 MB limit.`,
        400
      );
    }

    // 4. Fetch pickup to verify caller authorization
    const { data: pickups, error: fetchError } = await supabase
      .from("pickup_requests")
      .select(`
        id,
        receiver_id,
        status,
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

    const receiver = pickup.receivers as ReceiverModel | null;
    const isAdmin = profile.role === "admin";
    const isReceiverOwner = profile.role === "receiver" && profile.organization_id === receiver?.organization_id;

    if (!isAdmin && !isReceiverOwner) {
      return errorResponse("FORBIDDEN", "Forbidden: You are not authorized to upload proof for this pickup", 403);
    }

    // 5. Generate secure storage path
    const extension = file.type.split("/")[1] || "jpg";
    const safeExt = extension === "jpeg" ? "jpg" : extension;
    const sanitizedFilename = `proof_${Date.now()}.${safeExt}`;
    const storagePath = `receivers/${receiver?.id || profile.organization_id}/pickups/${pickupId}/${sanitizedFilename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. Upload to private 'pickup-proofs' bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("pickup-proofs")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return errorResponse("INTERNAL_SERVER_ERROR", `Proof upload failed: ${uploadError.message}`, 500);
    }

    // 7. Generate a signed preview URL valid for 1 hour
    const { data: signedData } = await supabase.storage
      .from("pickup-proofs")
      .createSignedUrl(uploadData.path, 3600);

    return successResponse({
      pickupId,
      storagePath: uploadData.path,
      signedUrl: signedData?.signedUrl || null,
      message: "Pickup proof image uploaded successfully.",
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred during proof upload", 500);
  }
}
