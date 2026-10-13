/**
 * Pickup Lifecycle & State Machine Rules
 *
 * Source of truth for pickup transitions, role authorization, and proof handling:
 * - requested -> scheduled (Kitchen or Admin confirms collection window)
 * - requested -> picked_up (Direct collection handover by Receiver or Admin)
 * - scheduled -> picked_up (Standard collection confirmation by Receiver or Admin)
 * - requested -> cancelled (Kitchen, Receiver, or Admin)
 * - scheduled -> cancelled (Kitchen, Receiver, or Admin)
 * - picked_up is TERMINAL (Redistribution verified, impact recorded)
 * - cancelled is TERMINAL
 */

export type PickupStatus = "requested" | "scheduled" | "picked_up" | "cancelled";
export type AppRole = "admin" | "kitchen" | "receiver" | "volunteer";

export const VALID_PICKUP_TRANSITIONS: Record<PickupStatus, PickupStatus[]> = {
  requested: ["scheduled", "picked_up", "cancelled"],
  scheduled: ["picked_up", "cancelled"],
  picked_up: [],
  cancelled: [],
};

export const ROLE_ALLOWED_TARGETS: Record<AppRole, PickupStatus[]> = {
  admin: ["scheduled", "picked_up", "cancelled"],
  kitchen: ["scheduled", "cancelled"],
  receiver: ["picked_up", "cancelled"],
  volunteer: [],
};

export function canTransitionPickupStatus(current: PickupStatus, next: PickupStatus): boolean {
  if (current === next) return true; // idempotent
  const allowed = VALID_PICKUP_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

export function getAllowedNextStatuses(current: PickupStatus): PickupStatus[] {
  return VALID_PICKUP_TRANSITIONS[current] || [];
}

export function isRoleAuthorizedForTransition(
  role: AppRole,
  current: PickupStatus,
  next: PickupStatus
): boolean {
  if (!canTransitionPickupStatus(current, next)) return false;
  if (current === next) return true;

  if (role === "admin") return true;

  if (role === "kitchen") {
    // Kitchen can schedule requested pickups or cancel requested/scheduled
    return next === "scheduled" || next === "cancelled";
  }

  if (role === "receiver") {
    // Receiver can collect (picked_up) or cancel
    return next === "picked_up" || next === "cancelled";
  }

  return false;
}

export const ALLOWED_PROOF_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateProofFile(
  mimeType: string,
  sizeBytes: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_PROOF_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type '${mimeType}'. Allowed formats: JPEG, PNG, WebP.`,
    };
  }
  if (sizeBytes > MAX_PROOF_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds 5MB limit (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }
  return { valid: true };
}

export function formatProofStoragePath(
  userIdOrPickupId: string,
  pickupIdOrFilename: string,
  optionalFilename?: string
): string {
  if (optionalFilename) {
    const userId = userIdOrPickupId;
    const pickupId = pickupIdOrFilename;
    const sanitized = optionalFilename.replace(/[^a-zA-Z0-9.-]/g, "_");
    return `pickup-proofs/${userId}/${pickupId}/${sanitized}`;
  }
  const pickupId = userIdOrPickupId;
  const sanitized = pickupIdOrFilename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${pickupId}/${sanitized}`;
}
