import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { authenticateKitchenUser } from "@/lib/kitchen/auth";
import { aiClassificationRequestSchema } from "@/lib/validation/surplus";
import { analyzeFoodSurplusImage } from "@/lib/ai/gemini";
import { evaluateRecoveryDecision } from "@/lib/rules/recovery-engine";
import type { SurplusItemModel } from "@/types/models";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parseResult = aiClassificationRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parseResult.error.errors[0]?.message || "Invalid classification request payload",
        400,
        parseResult.error.flatten()
      );
    }

    const { surplusId, notes: userNotes } = parseResult.data;

    const supabase = await createClient();

    // 1. Fetch surplus item record
    const { data: surplusRecords, error: fetchError } = await supabase
      .from("surplus_items")
      .select(`
        id,
        kitchen_id,
        source_meal_id,
        food_name,
        quantity,
        unit,
        prepared_at,
        reported_at,
        redistribution_deadline,
        status,
        category,
        ai_confidence,
        image_path,
        notes,
        created_at
      `)
      .eq("id", surplusId)
      .returns<SurplusItemModel[]>();

    const surplus = surplusRecords?.[0];
    if (fetchError || !surplus) {
      return errorResponse("NOT_FOUND", "Target surplus record not found", 404);
    }

    // 2. Authorize caller for surplus kitchen facility
    const authResult = await authenticateKitchenUser(surplus.kitchen_id);
    if (authResult.error) {
      return errorResponse(authResult.error.code, authResult.error.message, authResult.error.status);
    }

    // 3. Verify image exists in storage
    if (!surplus.image_path) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Cannot run visual AI classification: No image has been uploaded for this surplus item. Please upload a photo first.",
        400
      );
    }

    // 4. Download image buffer from private 'food-images' bucket
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("food-images")
      .download(surplus.image_path);

    if (downloadError || !fileData) {
      return errorResponse(
        "INTERNAL_SERVER_ERROR",
        `Failed to retrieve private image from storage: ${downloadError?.message || "File unavailable"}`,
        500
      );
    }

    const imageBuffer = Buffer.from(await fileData.arrayBuffer());
    const mimeType = fileData.type || "image/jpeg";

    // 5. Call server-side Gemini Vision analysis
    const aiResult = await analyzeFoodSurplusImage(imageBuffer, mimeType, userNotes || surplus.notes || undefined);

    if (aiResult.error || !aiResult.data) {
      // AI Failure does NOT alter or break the surplus item state; return clean error envelope
      return errorResponse(
        aiResult.error?.code || "AI_PROCESSING_ERROR",
        aiResult.error?.message || "AI visual classification failed. Please retry.",
        502,
        aiResult.error?.details
      );
    }

    const { foodType, category, visibleCondition, confidence, notes: aiNotes, advisory, advisoryNotice } = aiResult.data;

    // 6. Update surplus record in PostgreSQL with verified category & confidence
    const updatedNotes = userNotes
      ? `${userNotes} | AI: ${visibleCondition}`
      : visibleCondition || surplus.notes;

    const { error: updateError } = await (supabase as any)
      .from("surplus_items")
      .update({
        category,
        ai_confidence: confidence,
        notes: updatedNotes,
      })
      .eq("id", surplusId);

    if (updateError) {
      return errorResponse(
        "INTERNAL_SERVER_ERROR",
        `Failed to update surplus classification: ${updateError.message}`,
        500
      );
    }

    // 7. Calculate deterministic recovery decision with new category & confidence
    const recoveryDecision = evaluateRecoveryDecision({
      status: surplus.status,
      category,
      preparedAt: surplus.prepared_at,
      redistributionDeadline: surplus.redistribution_deadline,
      quantity: Number(surplus.quantity),
      aiConfidence: confidence,
    });

    return successResponse({
      surplusId,
      foodType,
      category,
      visibleCondition,
      confidence,
      advisory,
      advisoryNotice,
      notes: aiNotes,
      recoveryDecision,
    });
  } catch {
    return errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred during AI visual classification", 500);
  }
}
