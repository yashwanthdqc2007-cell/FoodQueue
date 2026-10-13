import { SupabaseClient } from "@supabase/supabase-js";
import { normalizeQuantityToKg } from "@/lib/rules/impact-calculator";

export interface ReceiverAnalyticsSummary {
  period: string;
  dateRange: {
    start: string | null;
    end: string;
  };
  summary: {
    totalPickupsCompleted: number;
    totalFoodCollectedKg: number;
    estimatedMealsProvided: number;
    estimatedCo2eAvoidedKg: number;
    estimatedValueSavedInr: number;
  };
  assumptions: {
    mealEquivalentKg: number;
    co2eMultiplierKgPerKg: number;
    valuePerKgInr: number;
  };
  donorKitchens: Array<{
    kitchenId: string;
    kitchenName: string;
    foodCollectedKg: number;
    pickupCount: number;
  }>;
  recentCompletedPickups: Array<{
    pickupId: string;
    foodName: string;
    quantity: number;
    unit: string;
    kitchenName: string;
    pickedUpAt: string | null;
    proofUrl: string | null;
  }>;
}

export async function getReceiverAnalytics(
  supabase: SupabaseClient<any, "public", any>,
  receiverId: string,
  dateRange: { startIso: string | null; endIso: string },
  periodLabel: string
): Promise<ReceiverAnalyticsSummary> {
  // 1. Fetch completed pickups for this receiver
  let pickupQuery = supabase
    .from("pickup_requests")
    .select(`
      id,
      surplus_id,
      receiver_id,
      requested_at,
      scheduled_at,
      picked_up_at,
      status,
      proof_image_path,
      surplus_items (
        id,
        food_name,
        quantity,
        unit,
        category,
        kitchen_id,
        kitchens (
          id,
          name,
          address
        )
      )
    `)
    .eq("receiver_id", receiverId)
    .eq("status", "picked_up")
    .order("picked_up_at", { ascending: false });

  if (dateRange.startIso) {
    pickupQuery = pickupQuery.gte("requested_at", dateRange.startIso);
  }
  pickupQuery = pickupQuery.lte("requested_at", dateRange.endIso);

  const { data: pickupsData, error: pErr } = await pickupQuery;
  if (pErr) throw new Error(`Failed to load receiver pickups: ${pErr.message}`);
  const pickups = pickupsData || [];

  let totalFoodCollectedKg = 0;
  const donorMap = new Map<string, { name: string; foodKg: number; count: number }>();
  const recentCompletedPickups = [];

  for (const p of pickups) {
    const s = p.surplus_items as unknown as {
      id: string;
      food_name: string;
      quantity: number;
      unit: string;
      kitchen_id: string;
      kitchens?: { id: string; name: string };
    };

    if (s) {
      const kg = normalizeQuantityToKg(s.quantity, s.unit);
      totalFoodCollectedKg += kg;

      const kId = s.kitchens?.id || s.kitchen_id;
      const kName = s.kitchens?.name || "Partner Kitchen";
      const existing = donorMap.get(kId) || { name: kName, foodKg: 0, count: 0 };
      existing.foodKg += kg;
      existing.count += 1;
      donorMap.set(kId, existing);

      recentCompletedPickups.push({
        pickupId: p.id,
        foodName: s.food_name,
        quantity: Number(s.quantity),
        unit: s.unit,
        kitchenName: kName,
        pickedUpAt: (p as any).picked_up_at || null,
        proofUrl: (p as any).proof_image_path || null,
      });
    }
  }

  const totalKgRounded = Math.round(totalFoodCollectedKg * 100) / 100;
  const estimatedMeals = Math.round((totalKgRounded / 0.4) * 100) / 100;
  const estimatedCo2e = Math.round(totalKgRounded * 2.5 * 100) / 100;
  const estimatedValue = Math.round(totalKgRounded * 60 * 100) / 100;

  const donorKitchens = Array.from(donorMap.entries())
    .map(([kitchenId, val]) => ({
      kitchenId,
      kitchenName: val.name,
      foodCollectedKg: Math.round(val.foodKg * 100) / 100,
      pickupCount: val.count,
    }))
    .sort((a, b) => b.foodCollectedKg - a.foodCollectedKg);

  return {
    period: periodLabel,
    dateRange: {
      start: dateRange.startIso,
      end: dateRange.endIso,
    },
    summary: {
      totalPickupsCompleted: pickups.length,
      totalFoodCollectedKg: totalKgRounded,
      estimatedMealsProvided: estimatedMeals,
      estimatedCo2eAvoidedKg: estimatedCo2e,
      estimatedValueSavedInr: estimatedValue,
    },
    assumptions: {
      mealEquivalentKg: 0.4,
      co2eMultiplierKgPerKg: 2.5,
      valuePerKgInr: 60,
    },
    donorKitchens,
    recentCompletedPickups: recentCompletedPickups.slice(0, 10),
  };
}
