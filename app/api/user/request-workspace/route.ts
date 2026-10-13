import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) {
    return errorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  let body: { workspace?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON payload", 400);
  }

  const { workspace } = body;
  if (workspace !== "kitchen" && workspace !== "receiver") {
    return errorResponse("VALIDATION_ERROR", "Requested workspace must be 'kitchen' or 'receiver'", 400);
  }

  // Update Supabase Auth user_metadata (non-authoritative preference, does NOT elevate permissions or assign organization)
  const { data: updated, error: updateError } = await supabase.auth.updateUser({
    data: {
      requested_workspace: workspace,
      requested_at: new Date().toISOString(),
    },
  });

  if (updateError) {
    return errorResponse("INTERNAL_SERVER_ERROR", updateError.message || "Failed to record workspace preference", 500);
  }

  return successResponse({
    requestedWorkspace: workspace,
    user: {
      id: updated.user.id,
      email: updated.user.email,
    },
    message: "Requested workspace recorded successfully. Pending administrator assignment.",
  });
}
