/**
 * Deterministic Redistribution Matching Score Engine
 *
 * Implements the locked multi-factor scoring formula:
 * - Distance Compatibility       = 40%
 * - Quantity Compatibility       = 25%
 * - Urgency / Time Remaining     = 20%
 * - Receiver Capacity Scale      = 10%
 * - Priority Level               = 5%
 *
 * Final match score strictly bounded in [0, 100].
 */

import { calculateHaversineDistanceKm, Coordinates } from "./distance";

export interface ScoringSurplusInput {
  quantity: number;
  remainingMinutes: number;
  isExpired: boolean;
  coordinates: Coordinates | null;
}

export interface ScoringReceiverInput {
  maxCapacity: number;
  priorityLevel: number; // 1 to 5
  coordinates: Coordinates | null;
}

export interface FactorBreakdown {
  distanceScore: number;
  quantityScore: number;
  urgencyScore: number;
  capacityScore: number;
  priorityScore: number;
  distanceKm: number;
}

export interface MatchScoreResult {
  finalScore: number;
  breakdown: FactorBreakdown;
  explainableReasons: string[];
}

export const MATCH_WEIGHTS = {
  DISTANCE: 0.40,
  QUANTITY: 0.25,
  URGENCY: 0.20,
  CAPACITY: 0.10,
  PRIORITY: 0.05,
} as const;

/**
 * Normalizes geographic distance (km) into [10, 100].
 * <= 1.0 km -> 100 points
 * >= 25.0 km -> 10 points
 */
export function calculateDistanceScore(distanceKm: number): number {
  if (distanceKm <= 1.0) return 100;
  if (distanceKm >= 25.0) return 10;
  // Linear decay between 1.0 km (100) and 25.0 km (10)
  const score = 100 - (distanceKm - 1.0) * (90 / 24.0);
  return Math.round(Math.max(10, Math.min(100, score)) * 100) / 100;
}

/**
 * Normalizes quantity match against receiver capacity into [0, 100].
 * Ideal ratio r = surplus_quantity / receiver_capacity is between 0.5 and 1.0.
 */
export function calculateQuantityScore(surplusQuantity: number, receiverCapacity: number): number {
  if (receiverCapacity <= 0) return 0;
  const ratio = surplusQuantity / receiverCapacity;

  if (ratio > 1.0) {
    // Over capacity
    const score = 100 - (ratio - 1.0) * 100;
    return Math.round(Math.max(0, score) * 100) / 100;
  }

  // Ideal target is ~75% utilization
  const deviation = Math.abs(ratio - 0.75);
  const score = 100 - deviation * 50;
  return Math.round(Math.max(30, Math.min(100, score)) * 100) / 100;
}

/**
 * Normalizes urgency based on remaining minutes before deadline.
 * Urgent batches receive higher match urgency scores to expedite recovery.
 */
export function calculateUrgencyScore(remainingMinutes: number, isExpired: boolean): number {
  if (isExpired || remainingMinutes <= 0) return 0;
  if (remainingMinutes <= 30) return 100; // < 30m critical
  if (remainingMinutes <= 60) return 85;  // 30m - 60m urgent
  if (remainingMinutes <= 180) return 70; // 1h - 3h standard
  return 50; // > 3h ample time
}

/**
 * Normalizes receiver intake scale into [10, 100].
 */
export function calculateCapacityScaleScore(receiverCapacity: number): number {
  const score = (Math.min(100, receiverCapacity) / 100) * 90 + 10;
  return Math.round(Math.max(10, Math.min(100, score)) * 100) / 100;
}

/**
 * Normalizes receiver priority level (1 to 5) into [20, 100].
 */
export function calculatePriorityScore(priorityLevel: number): number {
  const boundedLevel = Math.max(1, Math.min(5, priorityLevel || 1));
  return boundedLevel * 20;
}

/**
 * Computes the complete deterministic multi-factor match score and explainable reasons.
 */
export function computeMatchScore(
  surplus: ScoringSurplusInput,
  receiver: ScoringReceiverInput
): MatchScoreResult {
  // 1. Distance Calculation
  let distanceKm = 5.0; // Default fallback if coordinates unavailable
  if (surplus.coordinates && receiver.coordinates) {
    distanceKm = calculateHaversineDistanceKm(surplus.coordinates, receiver.coordinates);
  }

  const distanceScore = calculateDistanceScore(distanceKm);
  const quantityScore = calculateQuantityScore(surplus.quantity, receiver.maxCapacity);
  const urgencyScore = calculateUrgencyScore(surplus.remainingMinutes, surplus.isExpired);
  const capacityScore = calculateCapacityScaleScore(receiver.maxCapacity);
  const priorityScore = calculatePriorityScore(receiver.priorityLevel);

  // 2. Weighted Sum
  const rawScore =
    MATCH_WEIGHTS.DISTANCE * distanceScore +
    MATCH_WEIGHTS.QUANTITY * quantityScore +
    MATCH_WEIGHTS.URGENCY * urgencyScore +
    MATCH_WEIGHTS.CAPACITY * capacityScore +
    MATCH_WEIGHTS.PRIORITY * priorityScore;

  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore)) * 10) / 10;

  // 3. Generate Explainable Reasons
  const explainableReasons: string[] = [];

  if (distanceKm <= 3.0) {
    explainableReasons.push(`Highly proximate: ${distanceKm} km away`);
  } else if (distanceKm <= 10.0) {
    explainableReasons.push(`Within operational range: ${distanceKm} km away`);
  } else {
    explainableReasons.push(`${distanceKm} km transit distance`);
  }

  const utilization = Math.round((surplus.quantity / (receiver.maxCapacity || 1)) * 100);
  explainableReasons.push(
    `Capacity fit: ${surplus.quantity} kg of ${receiver.maxCapacity} kg capacity (${utilization}% load)`
  );

  if (urgencyScore >= 85) {
    explainableReasons.push("High urgency compatibility for active rescue window");
  } else {
    explainableReasons.push("Standard redistribution window");
  }

  if (receiver.priorityLevel >= 4) {
    explainableReasons.push(`Priority Level ${receiver.priorityLevel} community partner`);
  }

  return {
    finalScore,
    breakdown: {
      distanceScore,
      quantityScore,
      urgencyScore,
      capacityScore,
      priorityScore,
      distanceKm,
    },
    explainableReasons,
  };
}
