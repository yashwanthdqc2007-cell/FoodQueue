/**
 * Receiver Eligibility Engine
 *
 * Deterministically filters candidate receivers before scoring.
 * Evaluates verification status, capacity bounds, food type compatibility,
 * operational context, and organization boundaries.
 */

export interface EligibilitySurplusInput {
  id: string;
  foodName: string;
  quantity: number;
  unit: string;
  category: string;
  status: string;
  isExpired: boolean;
  kitchenOrgId: string;
}

export interface EligibilityReceiverInput {
  id: string;
  organizationId: string;
  organizationName: string;
  verified: boolean;
  maxCapacity: number;
  acceptedFoodTypes: string[];
  receiverType: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reasonCodes: string[];
  rejectionReasons: string[];
}

export function evaluateReceiverEligibility(
  surplus: EligibilitySurplusInput,
  receiver: EligibilityReceiverInput
): EligibilityResult {
  const reasonCodes: string[] = [];
  const rejectionReasons: string[] = [];

  // 1. Surplus must be active
  if (surplus.status !== "active") {
    reasonCodes.push("SURPLUS_NOT_ACTIVE");
    rejectionReasons.push(`Surplus status is '${surplus.status}', only 'active' surplus can be matched.`);
  }

  // 2. Surplus must not be expired
  if (surplus.isExpired) {
    reasonCodes.push("SURPLUS_DEADLINE_EXPIRED");
    rejectionReasons.push("Redistribution deadline has passed.");
  }

  // 3. Receiver organization must be valid
  if (!receiver.organizationId) {
    reasonCodes.push("INVALID_ORGANIZATION");
    rejectionReasons.push("Receiver is not assigned to a valid operating organization.");
  }

  // 4. Receiver must be verified
  if (!receiver.verified) {
    reasonCodes.push("RECEIVER_NOT_VERIFIED");
    rejectionReasons.push("Receiver organization has not completed administrative verification.");
  }

  // 5. Receiver cannot be the source kitchen organization
  if (receiver.organizationId && surplus.kitchenOrgId && receiver.organizationId === surplus.kitchenOrgId) {
    reasonCodes.push("SAME_ORGANIZATION_BOUNDARY");
    rejectionReasons.push("Receiver belongs to the same organization as the originating kitchen.");
  }

  // 6. Receiver capacity must be sufficient to absorb surplus batch
  if (receiver.maxCapacity < surplus.quantity) {
    reasonCodes.push("INSUFFICIENT_CAPACITY");
    rejectionReasons.push(
      `Surplus quantity (${surplus.quantity} ${surplus.unit}) exceeds receiver max intake capacity (${receiver.maxCapacity} ${surplus.unit}).`
    );
  }

  // 7. Food type / category compatibility
  if (receiver.acceptedFoodTypes && receiver.acceptedFoodTypes.length > 0) {
    const acceptedList = receiver.acceptedFoodTypes.map((t) => t.toLowerCase().trim().replace(/[\s-]+/g, "_"));
    const foodNormalized = surplus.foodName.toLowerCase().trim().replace(/[\s-]+/g, "_");
    const categoryNormalized = surplus.category.toLowerCase().trim();

    const acceptsAll = acceptedList.includes("*") || acceptedList.includes("all") || acceptedList.includes("any");
    const matchesCategory = acceptedList.includes(categoryNormalized);
    const matchesFood = acceptedList.some(
      (accepted) => foodNormalized.includes(accepted) || accepted.includes(foodNormalized)
    );

    if (!acceptsAll && !matchesCategory && !matchesFood) {
      reasonCodes.push("INCOMPATIBLE_FOOD_TYPE");
      rejectionReasons.push(
        `Receiver does not accept '${surplus.foodName}' (${surplus.category.replace("_", " ")}).`
      );
    }
  }

  const eligible = rejectionReasons.length === 0;
  if (eligible) {
    reasonCodes.push("ELIGIBLE");
  }

  return {
    eligible,
    reasonCodes,
    rejectionReasons,
  };
}
