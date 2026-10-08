import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { authenticateKitchenUser } from "@/lib/kitchen/auth";
import type { SurplusItemModel } from "@/types/models";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const surplusId = formData.get("surplusId") as string | null;
    const file = formData.get("file") as File | null;

    if (!surplusId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(surplusId)) {
      return errorResponse("VALIDATION_ERROR", "Valid surplus UUID is required", 400);
    }

    if (!file) {
      return errorResponse("VALIDATION_ERROR", "Image file is required", 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return errorResponse(
        "VALIDATION_ERROR",
        `Unsupported image format (${file.type}). Allowed formats: JPEG, PNG, WebP`,
        400
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return errorResponse("VALIDATION_ERROR", "Image size exceeds maximum limit of 5 MB", 400);
    }

    const supabase = await createClient();

    // 1. Fetch surplus item to verify existence & kitchen ownership
    const { data: surplusRecords, error: fetchError } = await supabase
      .from("surplus_items")
      .select("id, kitchen_id, image_path, food_name")
      .eq("id", surplusId)
      .returns<SurplusItemModel[]>();

    const surplus = surplusRecords?.[0];
    if (fetchError || !surplus) {
      return errorResponse("NOT_FOUND", "Target surplus record not found", 404);
    }

    // 2. Authorize caller for surplus item's kitchen
    const authResult = await authenticateKitchenUser(surplus.kitchen_id);
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    const user = authResult.user!;

    // 3. Construct storage path: {user_id}/{surplus_id}/{timestamp}_{sanitized_name}
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${Date.now()}_${sanitizedName}`;
    const storagePath = `${user.id}/${surplusId}/${filename}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 4. Upload buffer to private 'food-images' bucket
    const { error: uploadError } = await supabase.storage
      .from("food-images")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return errorResponse(
        "INTERNAL_SERVER_ERROR",
        `Storage upload failed: ${uploadError.message}`,
        500
      );
    }

    // 5. Update surplus_items.image_path
    const { error: updateError } = await (supabase as any)
      .from("surplus_items")
      .update({ image_path: storagePath })
      .eq("id", surplusId);

    if (updateError) {
      return errorResponse(
        "INTERNAL_SERVER_ERROR",
        `Failed to update surplus record with image path: ${updateError.message}`,
        500
      );
    }

    // 6. Generate signed URL for immediate secure client-side preview (valid 1 hour)
    const { data: signedUrlData } = await supabase.storage
      .from("food-images")
      .createSignedUrl(storagePath, 3600);

    return successResponse(
      {
        surplusId,
        imagePath: storagePath,
        signedUrl: signedUrlData?.signedUrl || null,
        filename,
        fileSize: file.size,
        mimeType: file.type,
      },
      201
    );
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred during image upload", 500);
  }
}
