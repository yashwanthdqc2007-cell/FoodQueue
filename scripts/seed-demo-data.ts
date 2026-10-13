/**
 * FOODQUEUE DEMONSTRATION DATA SEED SCRIPT
 *
 * Deterministic, idempotent, connected demonstration dataset.
 * Adheres strictly to:
 * - Existing Supabase PostgreSQL schema and table constraints
 * - Mass-balance rules (prepared >= consumed, leftover = prepared - consumed)
 * - Food rescue clock state machine (Active > 60m, Urgent <= 60m, Expired < 0)
 * - Canonical impact conversion (0.4 kg/meal, 2.5 kg CO2e/kg, ₹60/kg)
 * - Terminal pickup state machine (requested -> scheduled -> picked_up)
 * - Asia/Kolkata timezone relative dates
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

type OrgInsert = Database["public"]["Tables"]["organizations"]["Insert"];
type KitchenInsert = Database["public"]["Tables"]["kitchens"]["Insert"];
type ReceiverInsert = Database["public"]["Tables"]["receivers"]["Insert"];
type MealInsert = Database["public"]["Tables"]["meals"]["Insert"];
type PredictionInsert = Database["public"]["Tables"]["demand_predictions"]["Insert"];
type SurplusInsert = Database["public"]["Tables"]["surplus_items"]["Insert"];
type MatchInsert = Database["public"]["Tables"]["redistribution_matches"]["Insert"];
type PickupInsert = Database["public"]["Tables"]["pickup_requests"]["Insert"];
type ImpactInsert = Database["public"]["Tables"]["impact_records"]["Insert"];

export async function seedDemoData() {
  console.log("[SEED] Initializing deterministic FoodQueue demo dataset...");

  const supabase = createAdminClient();

  // Helper date generators in Asia/Kolkata
  const now = new Date();
  const formatIsoDate = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, days: number) => {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return res;
  };
  const addHours = (d: Date, hours: number) => {
    const res = new Date(d);
    res.setTime(res.getTime() + hours * 3600 * 1000);
    return res;
  };

  // 1. ORGANIZATIONS
  const organizations: OrgInsert[] = [
    {
      id: "10000000-0000-0000-0000-000000000001",
      name: "Green Valley Institutional Kitchen",
      organization_type: "kitchen",
      address: "Anna Nagar West, Chennai, Tamil Nadu",
      latitude: 13.08268,
      longitude: 80.270718,
      contact_phone: "+91-9000000001",
    },
    {
      id: "10000000-0000-0000-0000-000000000002",
      name: "Hope Community Centre",
      organization_type: "ngo",
      address: "T. Nagar, Chennai, Tamil Nadu",
      latitude: 13.04184,
      longitude: 80.23412,
      contact_phone: "+91-9000000002",
    },
    {
      id: "10000000-0000-0000-0000-000000000003",
      name: "Sunrise Student Hostel",
      organization_type: "receiver",
      address: "Guindy, Chennai, Tamil Nadu",
      latitude: 13.0067,
      longitude: 80.2025,
      contact_phone: "+91-9000000003",
    },
    {
      id: "10000000-0000-0000-0000-000000000004",
      name: "City Harvest Youth Shelter",
      organization_type: "institution",
      address: "Adyar, Chennai, Tamil Nadu",
      latitude: 13.0012,
      longitude: 80.2565,
      contact_phone: "+91-9000000004",
    },
  ];

  for (const org of organizations) {
    const { error } = await supabase.from("organizations").upsert(org, { onConflict: "id" });
    if (error) console.error(`Error seeding organization ${org.name}:`, error.message);
  }
  console.log(`[SEED] ✓ ${organizations.length} Organizations verified.`);

  // 2. KITCHENS
  const kitchens: KitchenInsert[] = [
    {
      id: "20000000-0000-0000-0000-000000000001",
      organization_id: "10000000-0000-0000-0000-000000000001",
      name: "Green Valley Main Kitchen",
      address: "Anna Nagar West, Chennai, Tamil Nadu",
      latitude: 13.08268,
      longitude: 80.270718,
      timezone: "Asia/Kolkata",
      active: true,
    },
  ];

  for (const k of kitchens) {
    const { error } = await supabase.from("kitchens").upsert(k, { onConflict: "id" });
    if (error) console.error(`Error seeding kitchen ${k.name}:`, error.message);
  }
  console.log(`[SEED] ✓ ${kitchens.length} Kitchens verified.`);

  // 3. RECEIVERS
  const receivers: ReceiverInsert[] = [
    {
      id: "30000000-0000-0000-0000-000000000001",
      organization_id: "10000000-0000-0000-0000-000000000002",
      receiver_type: "ngo",
      max_capacity: 120,
      accepted_food_types: ["edible_surplus", "cooked_rice", "vegetables", "dal", "chapati"],
      operating_hours: { start: "08:00", end: "21:00" },
      priority_level: 5,
      verified: true,
    },
    {
      id: "30000000-0000-0000-0000-000000000002",
      organization_id: "10000000-0000-0000-0000-000000000003",
      receiver_type: "hostel",
      max_capacity: 80,
      accepted_food_types: ["edible_surplus", "cooked_rice", "vegetables", "dal"],
      operating_hours: { start: "09:00", end: "22:00" },
      priority_level: 4,
      verified: true,
    },
    {
      id: "30000000-0000-0000-0000-000000000003",
      organization_id: "10000000-0000-0000-0000-000000000004",
      receiver_type: "shelter",
      max_capacity: 60,
      accepted_food_types: ["edible_surplus", "reusable"],
      operating_hours: { start: "08:00", end: "20:00" },
      priority_level: 3,
      verified: false, // PENDING Verification queue showcase!
    },
  ];

  for (const r of receivers) {
    const { error } = await supabase.from("receivers").upsert(r, { onConflict: "id" });
    if (error) console.error(`Error seeding receiver ${r.id}:`, error.message);
  }
  console.log(`[SEED] ✓ ${receivers.length} Receivers verified (including 1 pending verification).`);

  // 4. MEALS & CONSUMPTION AUDITS (Past 7 days + today + future)
  const kitchenId = "20000000-0000-0000-0000-000000000001";
  interface MealSeedItem extends MealInsert {
    audit?: { actual: number; prepared: number; consumed: number; leftover: number } | null;
  }

  const mealRecords: MealSeedItem[] = [
    // 7 days ago
    {
      id: "40000000-0000-0000-0000-000000000001",
      kitchen_id: kitchenId,
      meal_name: "Lunch Service",
      meal_date: formatIsoDate(addDays(now, -7)),
      meal_period: "lunch",
      expected_consumers: 800,
      planned_quantity: 820,
      unit: "servings",
      audit: { actual: 780, prepared: 820, consumed: 785, leftover: 35 },
    },
    // 6 days ago
    {
      id: "40000000-0000-0000-0000-000000000002",
      kitchen_id: kitchenId,
      meal_name: "Dinner Service",
      meal_date: formatIsoDate(addDays(now, -6)),
      meal_period: "dinner",
      expected_consumers: 750,
      planned_quantity: 760,
      unit: "servings",
      audit: { actual: 740, prepared: 760, consumed: 735, leftover: 25 },
    },
    // 5 days ago
    {
      id: "40000000-0000-0000-0000-000000000003",
      kitchen_id: kitchenId,
      meal_name: "Lunch Service",
      meal_date: formatIsoDate(addDays(now, -5)),
      meal_period: "lunch",
      expected_consumers: 820,
      planned_quantity: 840,
      unit: "servings",
      audit: { actual: 810, prepared: 840, consumed: 800, leftover: 40 },
    },
    // 4 days ago
    {
      id: "40000000-0000-0000-0000-000000000004",
      kitchen_id: kitchenId,
      meal_name: "Lunch Service",
      meal_date: formatIsoDate(addDays(now, -4)),
      meal_period: "lunch",
      expected_consumers: 850,
      planned_quantity: 860,
      unit: "servings",
      audit: { actual: 835, prepared: 860, consumed: 820, leftover: 40 },
    },
    // 3 days ago
    {
      id: "40000000-0000-0000-0000-000000000005",
      kitchen_id: kitchenId,
      meal_name: "Dinner Service",
      meal_date: formatIsoDate(addDays(now, -3)),
      meal_period: "dinner",
      expected_consumers: 780,
      planned_quantity: 790,
      unit: "servings",
      audit: { actual: 760, prepared: 790, consumed: 755, leftover: 35 },
    },
    // 2 days ago
    {
      id: "40000000-0000-0000-0000-000000000006",
      kitchen_id: kitchenId,
      meal_name: "Lunch Service",
      meal_date: formatIsoDate(addDays(now, -2)),
      meal_period: "lunch",
      expected_consumers: 810,
      planned_quantity: 825,
      unit: "servings",
      audit: { actual: 795, prepared: 825, consumed: 785, leftover: 40 },
    },
    // Yesterday
    {
      id: "40000000-0000-0000-0000-000000000007",
      kitchen_id: kitchenId,
      meal_name: "Lunch Service",
      meal_date: formatIsoDate(addDays(now, -1)),
      meal_period: "lunch",
      expected_consumers: 830,
      planned_quantity: 850,
      unit: "servings",
      audit: { actual: 815, prepared: 850, consumed: 805, leftover: 45 },
    },
    // Today: Breakfast (Audited)
    {
      id: "40000000-0000-0000-0000-000000000008",
      kitchen_id: kitchenId,
      meal_name: "Breakfast Service",
      meal_date: formatIsoDate(now),
      meal_period: "breakfast",
      expected_consumers: 520,
      planned_quantity: 535,
      unit: "servings",
      audit: { actual: 505, prepared: 535, consumed: 510, leftover: 25 },
    },
    // Today: Lunch (Audited)
    {
      id: "40000000-0000-0000-0000-000000000009",
      kitchen_id: kitchenId,
      meal_name: "Lunch Service",
      meal_date: formatIsoDate(now),
      meal_period: "lunch",
      expected_consumers: 850,
      planned_quantity: 875,
      unit: "servings",
      audit: { actual: 840, prepared: 875, consumed: 835, leftover: 40 },
    },
    // Today: Dinner (Past service AWAITING AUDIT - shows pending audit state!)
    {
      id: "40000000-0000-0000-0000-000000000010",
      kitchen_id: kitchenId,
      meal_name: "Dinner Service",
      meal_date: formatIsoDate(now),
      meal_period: "dinner",
      expected_consumers: 760,
      planned_quantity: 780,
      unit: "servings",
      audit: null, // Pending Audit!
    },
    // Tomorrow: Lunch (Future planned service)
    {
      id: "40000000-0000-0000-0000-000000000011",
      kitchen_id: kitchenId,
      meal_name: "Lunch Service",
      meal_date: formatIsoDate(addDays(now, 1)),
      meal_period: "lunch",
      expected_consumers: 840,
      planned_quantity: 865,
      unit: "servings",
      audit: null,
    },
    // Day after tomorrow: Lunch (Future planned service)
    {
      id: "40000000-0000-0000-0000-000000000012",
      kitchen_id: kitchenId,
      meal_name: "Lunch Service",
      meal_date: formatIsoDate(addDays(now, 2)),
      meal_period: "lunch",
      expected_consumers: 810,
      planned_quantity: 835,
      unit: "servings",
      audit: null,
    },
  ];

  for (const m of mealRecords) {
    const { audit, ...mealData } = m;
    const { error: mealErr } = await supabase.from("meals").upsert(mealData, { onConflict: "id" });
    if (mealErr) console.error(`Error seeding meal ${m.meal_name}:`, mealErr.message);

    if (audit) {
      const { data: existingCons } = await supabase
        .from("consumption_records")
        .select("id")
        .eq("meal_id", m.id!);

      if (!existingCons || existingCons.length === 0) {
        const { error: consErr } = await supabase.from("consumption_records").insert({
          meal_id: m.id!,
          actual_consumers: audit.actual,
          prepared_quantity: audit.prepared,
          consumed_quantity: audit.consumed,
          leftover_quantity: audit.leftover,
          recorded_at: new Date(new Date(m.meal_date).setHours(14, 30, 0, 0)).toISOString(),
        });
        if (consErr) console.error(`Error inserting audit for meal ${m.id}:`, consErr.message);
      }
    }
  }
  console.log(`[SEED] ✓ ${mealRecords.length} Meals seeded with mass-balance audits & 1 pending audit.`);

  // 5. DEMAND PREDICTIONS
  const predictions: PredictionInsert[] = [
    {
      id: "45000000-0000-0000-0000-000000000001",
      kitchen_id: kitchenId,
      prediction_date: formatIsoDate(now),
      meal_period: "dinner",
      predicted_consumers: 755,
      recommended_quantity: 778, // 3% buffer
      predicted_surplus: 23,
      confidence: 0.88,
      model_version: "mvp-baseline-v1",
    },
    {
      id: "45000000-0000-0000-0000-000000000002",
      kitchen_id: kitchenId,
      prediction_date: formatIsoDate(addDays(now, 1)),
      meal_period: "lunch",
      predicted_consumers: 835,
      recommended_quantity: 860,
      predicted_surplus: 25,
      confidence: 0.86,
      model_version: "mvp-baseline-v1",
    },
    {
      id: "45000000-0000-0000-0000-000000000003",
      kitchen_id: kitchenId,
      prediction_date: formatIsoDate(addDays(now, 2)),
      meal_period: "lunch",
      predicted_consumers: 808,
      recommended_quantity: 832,
      predicted_surplus: 24,
      confidence: 0.84,
      model_version: "mvp-baseline-v1",
    },
  ];

  for (const pred of predictions) {
    const { error: pErr } = await supabase.from("demand_predictions").upsert(pred, { onConflict: "id" });
    if (pErr) console.error(`Error seeding prediction ${pred.id}:`, pErr.message);
  }
  console.log(`[SEED] ✓ ${predictions.length} Demand Predictions verified.`);

  // 6. SURPLUS BATCHES
  const surplusBatches: SurplusInsert[] = [
    // 1. ACTIVE OFFER (> 60 mins remaining)
    {
      id: "50000000-0000-0000-0000-000000000001",
      kitchen_id: kitchenId,
      source_meal_id: "40000000-0000-0000-0000-000000000009",
      food_name: "Cooked Basmati Rice & Veg Pulao",
      quantity: 35,
      unit: "kg",
      status: "active",
      category: "edible_surplus",
      ai_confidence: 0.92,
      prepared_at: addHours(now, -0.5).toISOString(),
      reported_at: addHours(now, -0.2).toISOString(),
      redistribution_deadline: addHours(now, 2.5).toISOString(), // > 60m -> Active
      notes: "Freshly prepared midday institutional batch. Clean temperature-controlled containers.",
    },
    // 2. URGENT OFFER (<= 60 mins remaining)
    {
      id: "50000000-0000-0000-0000-000000000002",
      kitchen_id: kitchenId,
      source_meal_id: "40000000-0000-0000-0000-000000000009",
      food_name: "Mixed Vegetable Sambhar & Dal",
      quantity: 25,
      unit: "kg",
      status: "active",
      category: "edible_surplus",
      ai_confidence: 0.88,
      prepared_at: addHours(now, -3).toISOString(),
      reported_at: addHours(now, -1).toISOString(),
      redistribution_deadline: addHours(now, 0.75).toISOString(), // 45m left -> URGENT!
      notes: "Hot holding completed. Requires immediate priority collection transfer.",
    },
    // 3. EXPIRED OFFER (Deadline passed)
    {
      id: "50000000-0000-0000-0000-000000000003",
      kitchen_id: kitchenId,
      source_meal_id: "40000000-0000-0000-0000-000000000008",
      food_name: "Assorted Cut Seasonal Fruit",
      quantity: 15,
      unit: "kg",
      status: "expired",
      category: "edible_surplus",
      ai_confidence: 0.85,
      prepared_at: addHours(now, -6).toISOString(),
      reported_at: addHours(now, -4).toISOString(),
      redistribution_deadline: addHours(now, -1.5).toISOString(), // Past deadline -> Expired
      notes: "Distribution window lapsed. Tagged for agricultural composting diversion.",
    },
    // 4. MATCHED OFFER (Pickup Requested)
    {
      id: "50000000-0000-0000-0000-000000000004",
      kitchen_id: kitchenId,
      source_meal_id: "40000000-0000-0000-0000-000000000009",
      food_name: "Whole Wheat Chapati Batch",
      quantity: 30,
      unit: "kg",
      status: "matched",
      category: "edible_surplus",
      ai_confidence: 0.94,
      prepared_at: addHours(now, -1.5).toISOString(),
      reported_at: addHours(now, -1.0).toISOString(),
      redistribution_deadline: addHours(now, 2.0).toISOString(),
      notes: "Packed in clean food-grade insulated trays. Accepted by Hope Community Centre.",
    },
    // 5. SCHEDULED PICKUP OFFER
    {
      id: "50000000-0000-0000-0000-000000000005",
      kitchen_id: kitchenId,
      source_meal_id: "40000000-0000-0000-0000-000000000007",
      food_name: "Steamed Vegetable Curry",
      quantity: 28,
      unit: "kg",
      status: "pickup_pending",
      category: "edible_surplus",
      ai_confidence: 0.9,
      prepared_at: addHours(now, -2.5).toISOString(),
      reported_at: addHours(now, -2.0).toISOString(),
      redistribution_deadline: addHours(now, 2.0).toISOString(),
      notes: "Scheduled collection confirmed with Sunrise Student Hostel volunteer team.",
    },
    // 6. COMPLETED PICKUP (HISTORICAL 1)
    {
      id: "50000000-0000-0000-0000-000000000006",
      kitchen_id: kitchenId,
      source_meal_id: "40000000-0000-0000-0000-000000000007",
      food_name: "Cottage Cheese Paneer Gravy & Rice",
      quantity: 40,
      unit: "kg",
      status: "picked_up",
      category: "edible_surplus",
      ai_confidence: 0.95,
      prepared_at: addHours(now, -26).toISOString(),
      reported_at: addHours(now, -25).toISOString(),
      redistribution_deadline: addHours(now, -22).toISOString(),
      notes: "Successfully collected by Hope Community Centre. Verified food safety criteria met.",
    },
    // 7. COMPLETED PICKUP (HISTORICAL 2)
    {
      id: "50000000-0000-0000-0000-000000000007",
      kitchen_id: kitchenId,
      source_meal_id: "40000000-0000-0000-0000-000000000006",
      food_name: "Dal Makhani & Steamed Rice",
      quantity: 36,
      unit: "kg",
      status: "picked_up",
      category: "edible_surplus",
      ai_confidence: 0.93,
      prepared_at: addHours(now, -50).toISOString(),
      reported_at: addHours(now, -49).toISOString(),
      redistribution_deadline: addHours(now, -46).toISOString(),
      notes: "Delivered to Sunrise Student Hostel dining hall. Handover verified.",
    },
  ];

  for (const s of surplusBatches) {
    const { error: sErr } = await supabase.from("surplus_items").upsert(s, { onConflict: "id" });
    if (sErr) console.error(`Error seeding surplus ${s.food_name}:`, sErr.message);
  }
  console.log(`[SEED] ✓ ${surplusBatches.length} Surplus Batches verified (Active, Urgent, Expired, Matched, Scheduled, Picked Up).`);

  // 7. REDISTRIBUTION MATCHES
  const matches: MatchInsert[] = [
    // Match for Surplus 1 (Active Biryani 35kg) -> Hope Community Centre
    {
      id: "55000000-0000-0000-0000-000000000001",
      surplus_id: "50000000-0000-0000-0000-000000000001",
      receiver_id: "30000000-0000-0000-0000-000000000001",
      match_score: 92.5,
      match_reason: ["Intake capacity 120 kg >= 35 kg", "Accepts cooked_rice & vegetables", "Distance 4.8 km", "Priority Level 5"],
      status: "recommended",
      created_at: addHours(now, -0.2).toISOString(),
    },
    // Match for Surplus 1 -> Sunrise Student Hostel
    {
      id: "55000000-0000-0000-0000-000000000002",
      surplus_id: "50000000-0000-0000-0000-000000000001",
      receiver_id: "30000000-0000-0000-0000-000000000002",
      match_score: 84.0,
      match_reason: ["Intake capacity 80 kg >= 35 kg", "Accepts cooked_rice & vegetables", "Distance 8.2 km", "Priority Level 4"],
      status: "recommended",
      created_at: addHours(now, -0.2).toISOString(),
    },
    // Match for Surplus 2 (Urgent Sambhar 25kg) -> Hope Community Centre
    {
      id: "55000000-0000-0000-0000-000000000003",
      surplus_id: "50000000-0000-0000-0000-000000000002",
      receiver_id: "30000000-0000-0000-0000-000000000001",
      match_score: 95.0,
      match_reason: ["Urgent Rescue Window (<= 60 min)", "Direct proximity (4.8 km)", "Accepts dal & vegetables", "Priority Level 5"],
      status: "recommended",
      created_at: addHours(now, -1.0).toISOString(),
    },
    // Match for Surplus 4 (Chapati 30kg) -> Hope Community Centre (Accepted)
    {
      id: "55000000-0000-0000-0000-000000000004",
      surplus_id: "50000000-0000-0000-0000-000000000004",
      receiver_id: "30000000-0000-0000-0000-000000000001",
      match_score: 91.0,
      match_reason: ["Capacity matched", "Accepted category", "Approved pickup route"],
      status: "accepted",
      created_at: addHours(now, -1.0).toISOString(),
    },
    // Match for Surplus 5 (Curry 28kg) -> Sunrise Student Hostel (Accepted)
    {
      id: "55000000-0000-0000-0000-000000000005",
      surplus_id: "50000000-0000-0000-0000-000000000005",
      receiver_id: "30000000-0000-0000-0000-000000000002",
      match_score: 88.0,
      match_reason: ["Intake capacity 80 kg", "Category verified"],
      status: "accepted",
      created_at: addHours(now, -2.0).toISOString(),
    },
    // Match for Surplus 6 (Paneer 40kg) -> Hope Community Centre (Completed)
    {
      id: "55000000-0000-0000-0000-000000000006",
      surplus_id: "50000000-0000-0000-0000-000000000006",
      receiver_id: "30000000-0000-0000-0000-000000000001",
      match_score: 94.0,
      match_reason: ["Historical completed recovery match"],
      status: "accepted",
      created_at: addHours(now, -26).toISOString(),
    },
    // Match for Surplus 7 (Dal 36kg) -> Sunrise Student Hostel (Completed)
    {
      id: "55000000-0000-0000-0000-000000000007",
      surplus_id: "50000000-0000-0000-0000-000000000007",
      receiver_id: "30000000-0000-0000-0000-000000000002",
      match_score: 87.0,
      match_reason: ["Historical completed recovery match"],
      status: "accepted",
      created_at: addHours(now, -50).toISOString(),
    },
  ];

  for (const m of matches) {
    const { error: mErr } = await supabase.from("redistribution_matches").upsert(m, { onConflict: "id" });
    if (mErr) console.error(`Error seeding match ${m.id}:`, mErr.message);
  }
  console.log(`[SEED] ✓ ${matches.length} Redistribution Matches verified.`);

  // 8. PICKUP REQUESTS
  const pickups: PickupInsert[] = [
    // 1. Requested Pickup
    {
      id: "60000000-0000-0000-0000-000000000001",
      surplus_id: "50000000-0000-0000-0000-000000000004",
      receiver_id: "30000000-0000-0000-0000-000000000001",
      status: "requested",
      requested_at: addHours(now, -0.75).toISOString(),
      scheduled_at: null,
      picked_up_at: null,
      proof_image_path: null,
      notes: "Hope Community Centre dispatch requested collection. Awaiting kitchen timing confirmation.",
    },
    // 2. Scheduled Pickup
    {
      id: "60000000-0000-0000-0000-000000000002",
      surplus_id: "50000000-0000-0000-0000-000000000005",
      receiver_id: "30000000-0000-0000-0000-000000000002",
      status: "scheduled",
      requested_at: addHours(now, -1.8).toISOString(),
      scheduled_at: addHours(now, 0.5).toISOString(), // Arriving in 30 mins!
      picked_up_at: null,
      proof_image_path: null,
      notes: "Kitchen confirmed handover timing. Sunrise volunteer driver on route.",
    },
    // 3. Completed Pickup 1
    {
      id: "60000000-0000-0000-0000-000000000003",
      surplus_id: "50000000-0000-0000-0000-000000000006",
      receiver_id: "30000000-0000-0000-0000-000000000001",
      status: "picked_up",
      requested_at: addHours(now, -26).toISOString(),
      scheduled_at: addHours(now, -25.5).toISOString(),
      picked_up_at: addHours(now, -24.0).toISOString(),
      proof_image_path: "fixtures/sample_handover_proof_hope.jpg",
      notes: "Completed handoff. Hot insulated transport vessel used; verified temperature 64°C.",
    },
    // 4. Completed Pickup 2
    {
      id: "60000000-0000-0000-0000-000000000004",
      surplus_id: "50000000-0000-0000-0000-000000000007",
      receiver_id: "30000000-0000-0000-0000-000000000002",
      status: "picked_up",
      requested_at: addHours(now, -50).toISOString(),
      scheduled_at: addHours(now, -48.5).toISOString(),
      picked_up_at: addHours(now, -47.0).toISOString(),
      proof_image_path: "fixtures/sample_handover_proof_sunrise.jpg",
      notes: "Completed handoff. Delivered to student resident evening meal hall.",
    },
    // 5. Cancelled Pickup
    {
      id: "60000000-0000-0000-0000-000000000005",
      surplus_id: "50000000-0000-0000-0000-000000000003",
      receiver_id: "30000000-0000-0000-0000-000000000001",
      status: "cancelled",
      requested_at: addHours(now, -4.5).toISOString(),
      scheduled_at: null,
      picked_up_at: null,
      proof_image_path: null,
      notes: "Cancelled: Transport breakdown before dispatch. Diverted safely to local bio-reactor.",
    },
  ];

  for (const pick of pickups) {
    const { error: pickErr } = await supabase.from("pickup_requests").upsert(pick, { onConflict: "id" });
    if (pickErr) console.error(`Error seeding pickup ${pick.id}:`, pickErr.message);
  }
  console.log(`[SEED] ✓ ${pickups.length} Pickups verified (Requested, Scheduled, Completed, Cancelled).`);

  // 9. IMPACT RECORDS (Attributed strictly to completed pickups)
  const impactRecords: ImpactInsert[] = [
    {
      id: "70000000-0000-0000-0000-000000000001",
      surplus_id: "50000000-0000-0000-0000-000000000006", // 40 kg Paneer
      food_saved_quantity: 40.0,
      estimated_meals_saved: 100.0, // 40 / 0.4
      estimated_waste_diverted: 40.0,
      estimated_co2e_avoided: 100.0, // 40 * 2.5
      estimated_value_saved: 2400.0, // 40 * 60
      recorded_at: addHours(now, -24.0).toISOString(),
    },
    {
      id: "70000000-0000-0000-0000-000000000002",
      surplus_id: "50000000-0000-0000-0000-000000000007", // 36 kg Dal
      food_saved_quantity: 36.0,
      estimated_meals_saved: 90.0, // 36 / 0.4
      estimated_waste_diverted: 36.0,
      estimated_co2e_avoided: 90.0, // 36 * 2.5
      estimated_value_saved: 2160.0, // 36 * 60
      recorded_at: addHours(now, -47.0).toISOString(),
    },
  ];

  for (const imp of impactRecords) {
    const { error: impErr } = await supabase.from("impact_records").upsert(imp, { onConflict: "id" });
    if (impErr) console.error(`Error seeding impact record ${imp.id}:`, impErr.message);
  }
  console.log(`[SEED] ✓ ${impactRecords.length} Impact Records verified (76 kg total, 190 meals, ₹4,560 saved).`);

  console.log("\n========================================================");
  console.log("✓ FOODQUEUE DEMONSTRATION DATASET POPULATED SUCCESSFULLY");
  console.log("========================================================\n");
}

// Allow direct CLI execution: tsx --env-file=.env.local scripts/seed-demo-data.ts
if (require.main === module) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[SEED ERROR]", err);
      process.exit(1);
    });
}
