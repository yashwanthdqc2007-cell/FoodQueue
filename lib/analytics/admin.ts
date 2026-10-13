import { SupabaseClient } from "@supabase/supabase-js";
import { normalizeQuantityToKg } from "@/lib/rules/impact-calculator";

export interface AdminAnalyticsSummary {
  period: string;
  dateRange: {
    start: string | null;
    end: string;
  };
  ecosystem: {
    totalOrganizations: number;
    totalKitchens: number;
    totalReceivers: number;
    verifiedReceivers: number;
    organizationsByType: Record<string, number>;
  };
  operations: {
    totalSurplusReportedBatches: number;
    totalSurplusReportedKg: number;
    activeSurplusBatches: number;
    completedPickupsCount: number;
    totalImpactRecordsCount: number;
  };
  impact: {
    totalFoodSavedKg: number;
    estimatedMealsSaved: number;
    estimatedWasteDivertedKg: number;
    estimatedCo2eAvoidedKg: number;
    estimatedValueSavedInr: number;
    assumptions: {
      mealEquivalentKg: number;
      co2eMultiplierKgPerKg: number;
      valuePerKgInr: number;
    };
  };
  surplusStatusDistribution: Record<string, number>;
  surplusCategoryDistribution: Record<string, number>;
  topDonorKitchens: Array<{
    kitchenId: string;
    name: string;
    foodSavedKg: number;
    completedPickups: number;
  }>;
  topReceivers: Array<{
    receiverId: string;
    name: string;
    type: string;
    foodCollectedKg: number;
    completedPickups: number;
  }>;
}

export async function getAdminAnalytics(
  supabase: SupabaseClient<any, "public", any>,
  dateRange: { startIso: string | null; endIso: string },
  periodLabel: string
): Promise<AdminAnalyticsSummary> {
  // 1. Fetch organization counts
  const { data: orgsData, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name, organization_type, created_at");
  if (orgErr) throw new Error(`Failed to load organizations: ${orgErr.message}`);
  const organizations = orgsData || [];

  const organizationsByType: Record<string, number> = {
    kitchen: 0,
    receiver: 0,
    institution: 0,
    ngo: 0,
    processing_unit: 0,
  };
  for (const org of organizations) {
    if (organizationsByType[org.organization_type] !== undefined) {
      organizationsByType[org.organization_type] += 1;
    }
  }

  // 2. Kitchens & Receivers counts
  const { data: kitchensData } = await supabase.from("kitchens").select("id, name, organization_id");
  const kitchens = kitchensData || [];

  const { data: receiversData } = await supabase
    .from("receivers")
    .select("id, organization_id, receiver_type, verified, organizations(name)");
  const receivers = receiversData || [];
  const verifiedReceivers = receivers.filter((r) => r.verified).length;

  // 3. Surplus items query in date range
  let surplusQuery = supabase
    .from("surplus_items")
    .select("id, kitchen_id, food_name, quantity, unit, status, category, reported_at");

  if (dateRange.startIso) {
    surplusQuery = surplusQuery.gte("reported_at", dateRange.startIso);
  }
  surplusQuery = surplusQuery.lte("reported_at", dateRange.endIso);

  const { data: surplusData, error: surplusErr } = await surplusQuery;
  if (surplusErr) throw new Error(`Failed to load surplus items: ${surplusErr.message}`);
  const surplusItems = surplusData || [];

  const statusDistribution: Record<string, number> = {
    active: 0,
    matched: 0,
    pickup_pending: 0,
    picked_up: 0,
    expired: 0,
    recovered: 0,
    disposed: 0,
  };
  const categoryDistribution: Record<string, number> = {
    edible_surplus: 0,
    reusable: 0,
    organic: 0,
    unsafe: 0,
    unknown: 0,
  };

  let totalSurplusReportedKg = 0;
  for (const s of surplusItems) {
    if (statusDistribution[s.status] !== undefined) statusDistribution[s.status] += 1;
    if (categoryDistribution[s.category] !== undefined) categoryDistribution[s.category] += 1;
    totalSurplusReportedKg += normalizeQuantityToKg(s.quantity, s.unit);
  }

  // 4. Impact records
  let impactQuery = supabase
    .from("impact_records")
    .select(`
      id,
      surplus_id,
      food_saved_quantity,
      estimated_meals_saved,
      estimated_waste_diverted,
      estimated_co2e_avoided,
      estimated_value_saved,
      recorded_at,
      surplus_items (
        kitchen_id,
        kitchens (
          id,
          name
        )
      )
    `);

  if (dateRange.startIso) {
    impactQuery = impactQuery.gte("recorded_at", dateRange.startIso);
  }
  impactQuery = impactQuery.lte("recorded_at", dateRange.endIso);

  const { data: impactData, error: impactErr } = await impactQuery;
  if (impactErr) throw new Error(`Failed to load impact records: ${impactErr.message}`);
  const impactRecords = impactData || [];

  let totalFoodSavedKg = 0;
  let estimatedMealsSaved = 0;
  let estimatedWasteDivertedKg = 0;
  let estimatedCo2eAvoidedKg = 0;
  let estimatedValueSavedInr = 0;

  const kitchenImpactMap = new Map<string, { name: string; foodSavedKg: number; count: number }>();

  for (const imp of impactRecords) {
    const saved = Number(imp.food_saved_quantity) || 0;
    totalFoodSavedKg += saved;
    estimatedMealsSaved += Number(imp.estimated_meals_saved) || (saved / 0.4);
    estimatedWasteDivertedKg += Number(imp.estimated_waste_diverted) || saved;
    estimatedCo2eAvoidedKg += Number(imp.estimated_co2e_avoided) || (saved * 2.5);
    estimatedValueSavedInr += Number(imp.estimated_value_saved) || (saved * 60);

    // Aggregate by donor kitchen
    const kData = (imp.surplus_items as unknown as { kitchen_id: string; kitchens?: { id: string; name: string } })?.kitchens;
    if (kData) {
      const existing = kitchenImpactMap.get(kData.id) || { name: kData.name, foodSavedKg: 0, count: 0 };
      existing.foodSavedKg += saved;
      existing.count += 1;
      kitchenImpactMap.set(kData.id, existing);
    }
  }

  // 5. Completed pickups count & Top receivers
  let pickupQuery = supabase
    .from("pickup_requests")
    .select(`
      id,
      receiver_id,
      status,
      requested_at,
      picked_up_at,
      surplus_items (
        quantity,
        unit
      ),
      receivers (
        id,
        receiver_type,
        organizations (
          name
        )
      )
    `)
    .eq("status", "picked_up");

  if (dateRange.startIso) {
    pickupQuery = pickupQuery.gte("requested_at", dateRange.startIso);
  }
  pickupQuery = pickupQuery.lte("requested_at", dateRange.endIso);

  const { data: pickupData } = await pickupQuery;
  const pickups = pickupData || [];

  const receiverImpactMap = new Map<string, { name: string; type: string; foodKg: number; count: number }>();
  for (const p of pickups) {
    const rData = p.receivers as unknown as { id: string; receiver_type: string; organizations?: { name: string } };
    const sData = p.surplus_items as unknown as { quantity: number; unit: string };
    if (rData && sData) {
      const rId = rData.id;
      const rName = rData.organizations?.name || "Community Partner";
      const sKg = normalizeQuantityToKg(sData.quantity, sData.unit);

      const existing = receiverImpactMap.get(rId) || { name: rName, type: rData.receiver_type, foodKg: 0, count: 0 };
      existing.foodKg += sKg;
      existing.count += 1;
      receiverImpactMap.set(rId, existing);
    }
  }

  const topDonorKitchens = Array.from(kitchenImpactMap.entries())
    .map(([kitchenId, val]) => ({
      kitchenId,
      name: val.name,
      foodSavedKg: Math.round(val.foodSavedKg * 100) / 100,
      completedPickups: val.count,
    }))
    .sort((a, b) => b.foodSavedKg - a.foodSavedKg)
    .slice(0, 5);

  const topReceivers = Array.from(receiverImpactMap.entries())
    .map(([receiverId, val]) => ({
      receiverId,
      name: val.name,
      type: val.type,
      foodCollectedKg: Math.round(val.foodKg * 100) / 100,
      completedPickups: val.count,
    }))
    .sort((a, b) => b.foodCollectedKg - a.foodCollectedKg)
    .slice(0, 5);

  return {
    period: periodLabel,
    dateRange: {
      start: dateRange.startIso,
      end: dateRange.endIso,
    },
    ecosystem: {
      totalOrganizations: organizations.length,
      totalKitchens: kitchens.length,
      totalReceivers: receivers.length,
      verifiedReceivers,
      organizationsByType,
    },
    operations: {
      totalSurplusReportedBatches: surplusItems.length,
      totalSurplusReportedKg: Math.round(totalSurplusReportedKg * 100) / 100,
      activeSurplusBatches: statusDistribution.active,
      completedPickupsCount: pickups.length,
      totalImpactRecordsCount: impactRecords.length,
    },
    impact: {
      totalFoodSavedKg: Math.round(totalFoodSavedKg * 100) / 100,
      estimatedMealsSaved: Math.round(estimatedMealsSaved * 100) / 100,
      estimatedWasteDivertedKg: Math.round(estimatedWasteDivertedKg * 100) / 100,
      estimatedCo2eAvoidedKg: Math.round(estimatedCo2eAvoidedKg * 100) / 100,
      estimatedValueSavedInr: Math.round(estimatedValueSavedInr * 100) / 100,
      assumptions: {
        mealEquivalentKg: 0.4,
        co2eMultiplierKgPerKg: 2.5,
        valuePerKgInr: 60,
      },
    },
    surplusStatusDistribution: statusDistribution,
    surplusCategoryDistribution: categoryDistribution,
    topDonorKitchens,
    topReceivers,
  };
}
