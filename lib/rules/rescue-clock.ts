/**
 * Food Rescue Clock Calculation Rules
 *
 * Implements deterministic urgency state and countdown calculation:
 * - ACTIVE: More than 60 minutes remaining before redistribution deadline
 * - URGENT: 60 minutes or less remaining before redistribution deadline
 * - EXPIRED: Redistribution deadline has passed or missing
 */

export type RescueClockStatus = "ACTIVE" | "URGENT" | "EXPIRED";

export interface RescueClockResult {
  status: RescueClockStatus;
  remainingMinutes: number;
  remainingSeconds: number;
  formattedRemaining: string;
  isExpired: boolean;
  deadlineIso: string | null;
}

export const RESCUE_CLOCK_THRESHOLDS = {
  URGENT_MINUTES_THRESHOLD: 60,
} as const;

/**
 * Computes rescue clock metrics based on redistribution deadline and reference timestamp.
 */
export function computeRescueClock(
  deadlineIso: string | null | undefined,
  nowInput?: Date | number
): RescueClockResult {
  if (!deadlineIso) {
    return {
      status: "EXPIRED",
      remainingMinutes: 0,
      remainingSeconds: 0,
      formattedRemaining: "No deadline specified",
      isExpired: true,
      deadlineIso: null,
    };
  }

  const deadlineDate = new Date(deadlineIso);
  if (isNaN(deadlineDate.getTime())) {
    return {
      status: "EXPIRED",
      remainingMinutes: 0,
      remainingSeconds: 0,
      formattedRemaining: "Invalid deadline",
      isExpired: true,
      deadlineIso: null,
    };
  }

  const now = nowInput instanceof Date ? nowInput.getTime() : typeof nowInput === "number" ? nowInput : Date.now();
  const diffMs = deadlineDate.getTime() - now;

  if (diffMs <= 0) {
    return {
      status: "EXPIRED",
      remainingMinutes: 0,
      remainingSeconds: 0,
      formattedRemaining: "Expired",
      isExpired: true,
      deadlineIso: deadlineDate.toISOString(),
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;

  const paddedH = String(hours).padStart(2, "0");
  const paddedM = String(minutes).padStart(2, "0");
  const paddedS = String(seconds).padStart(2, "0");
  const formattedRemaining = `${paddedH}:${paddedM}:${paddedS} remaining`;

  const isUrgent = totalMinutes <= RESCUE_CLOCK_THRESHOLDS.URGENT_MINUTES_THRESHOLD;

  return {
    status: isUrgent ? "URGENT" : "ACTIVE",
    remainingMinutes: totalMinutes,
    remainingSeconds: totalSeconds,
    formattedRemaining,
    isExpired: false,
    deadlineIso: deadlineDate.toISOString(),
  };
}
