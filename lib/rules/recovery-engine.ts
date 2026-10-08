/**
 * Deterministic Food Recovery Decision Engine
 *
 * Evaluates surplus metadata, deadline urgency, and classification observations
 * to compute a deterministic recovery pathway:
 * - REDISTRIBUTE: Direct consumption redistribution for valid edible surplus
 * - RECOVERY: Secondary processing, animal feed, composting, or biomass recovery
 * - DISPOSE: Safe disposal for unsafe/spoiled items
 */

import { computeRescueClock, RescueClockStatus } from "./rescue-clock";

export type RecoveryPathway = "REDISTRIBUTE" | "RECOVERY" | "DISPOSE";

export interface RecoveryEngineInput {
  status: "active" | "matched" | "pickup_pending" | "picked_up" | "expired" | "recovered" | "disposed";
  category: "edible_surplus" | "reusable" | "organic" | "unsafe" | "unknown";
  preparedAt?: string | null;
  redistributionDeadline?: string | null;
  quantity: number;
  aiConfidence?: number | null;
  now?: Date | number;
}

export interface RecoveryDecision {
  path: RecoveryPathway;
  eligible: boolean;
  urgency: RescueClockStatus;
  reasonCodes: string[];
  summary: string;
  actionRecommendation: string;
  hasAiAssessment: boolean;
}

export function evaluateRecoveryDecision(input: RecoveryEngineInput): RecoveryDecision {
  const clock = computeRescueClock(input.redistributionDeadline, input.now);
  const reasons: string[] = [];
  const hasAi = input.aiConfidence !== null && input.aiConfidence !== undefined && input.aiConfidence > 0;

  // 1. Check if status has already reached terminal disposal
  if (input.status === "disposed") {
    return {
      path: "DISPOSE",
      eligible: false,
      urgency: "EXPIRED",
      reasonCodes: ["STATUS_DISPOSED"],
      summary: "Item marked as disposed.",
      actionRecommendation: "Log disposal in waste management tracking.",
      hasAiAssessment: hasAi,
    };
  }

  // 2. Check if status has already reached terminal recovery
  if (input.status === "recovered") {
    return {
      path: "RECOVERY",
      eligible: false,
      urgency: clock.status,
      reasonCodes: ["STATUS_RECOVERED"],
      summary: "Item successfully routed to secondary recovery.",
      actionRecommendation: "Confirm secondary recovery intake.",
      hasAiAssessment: hasAi,
    };
  }

  // 3. Unsafe food classification -> Immediate DISPOSE
  if (input.category === "unsafe") {
    reasons.push("UNSAFE_FOOD_CATEGORY");
    return {
      path: "DISPOSE",
      eligible: false,
      urgency: "EXPIRED",
      reasonCodes: reasons,
      summary: "Food item categorized as unsafe for human consumption.",
      actionRecommendation: "Immediately isolate and discard according to kitchen safety protocols.",
      hasAiAssessment: hasAi,
    };
  }

  // 4. Redistribution deadline passed -> RECOVERY or DISPOSE
  if (clock.isExpired || input.status === "expired") {
    reasons.push("REDISTRIBUTION_DEADLINE_EXPIRED");
    if (input.category === "organic" || input.category === "reusable") {
      reasons.push("ELIGIBLE_FOR_ORGANIC_RECOVERY");
      return {
        path: "RECOVERY",
        eligible: true,
        urgency: "EXPIRED",
        reasonCodes: reasons,
        summary: "Human redistribution window closed; eligible for composting or industrial bio-recovery.",
        actionRecommendation: "Divert batch to organic composting or secondary bio-processing facility.",
        hasAiAssessment: hasAi,
      };
    }

    return {
      path: "RECOVERY",
      eligible: false,
      urgency: "EXPIRED",
      reasonCodes: reasons,
      summary: "Redistribution window expired. Safe direct human consumption window closed.",
      actionRecommendation: "Divert to secondary recovery/feed if allowed, or discard safely.",
      hasAiAssessment: hasAi,
    };
  }

  // 5. Category is organic or reusable
  if (input.category === "organic") {
    reasons.push("ORGANIC_COMPOSTING_PATHWAY");
    return {
      path: "RECOVERY",
      eligible: true,
      urgency: clock.status,
      reasonCodes: reasons,
      summary: "Organic food material suitable for composting or anaerobic digestion.",
      actionRecommendation: "Route directly to partner bio-digester or organic processing unit.",
      hasAiAssessment: hasAi,
    };
  }

  if (input.category === "reusable") {
    reasons.push("REUSABLE_INGREDIENT_PATHWAY");
    return {
      path: "RECOVERY",
      eligible: true,
      urgency: clock.status,
      reasonCodes: reasons,
      summary: "Ingredients or cooked prep suitable for secondary culinary processing.",
      actionRecommendation: "Repurpose within certified commercial kitchen or send to food processing unit.",
      hasAiAssessment: hasAi,
    };
  }

  // 6. Category is edible surplus
  if (input.category === "edible_surplus") {
    reasons.push("EDIBLE_SURPLUS_ACTIVE");
    if (clock.status === "URGENT") {
      reasons.push("HIGH_URGENCY_DEADLINE_NEAR");
    }
    return {
      path: "REDISTRIBUTE",
      eligible: true,
      urgency: clock.status,
      reasonCodes: reasons,
      summary: "Edible surplus verified and ready for direct community redistribution.",
      actionRecommendation: clock.status === "URGENT"
        ? "Priority redistribution: Less than 60 minutes remaining before deadline."
        : "Standard redistribution: Match with qualified receiver or community shelter.",
      hasAiAssessment: hasAi,
    };
  }

  // 7. Category is unknown (unclassified)
  reasons.push("CATEGORY_UNCLASSIFIED");
  return {
    path: "REDISTRIBUTE",
    eligible: true,
    urgency: clock.status,
    reasonCodes: reasons,
    summary: "Surplus recorded and active; pending visual assessment and receiver matching.",
    actionRecommendation: "Perform AI visual assessment and proceed with redistribution matching.",
    hasAiAssessment: hasAi,
  };
}
