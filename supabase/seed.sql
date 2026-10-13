-- Demo seed data for local/development use only.
-- Idempotent, deterministic, connected demonstration records.
-- Do not use these records as production data.

-- 1. ORGANIZATIONS
insert into public.organizations (id, name, organization_type, address, latitude, longitude, contact_phone)
values
  ('10000000-0000-0000-0000-000000000001', 'Green Valley Institutional Kitchen', 'kitchen', 'Anna Nagar West, Chennai, Tamil Nadu', 13.082680, 80.270718, '+91-9000000001'),
  ('10000000-0000-0000-0000-000000000002', 'Hope Community Centre', 'ngo', 'T. Nagar, Chennai, Tamil Nadu', 13.041840, 80.234120, '+91-9000000002'),
  ('10000000-0000-0000-0000-000000000003', 'Sunrise Student Hostel', 'receiver', 'Guindy, Chennai, Tamil Nadu', 13.006700, 80.202500, '+91-9000000003'),
  ('10000000-0000-0000-0000-000000000004', 'City Harvest Youth Shelter', 'institution', 'Adyar, Chennai, Tamil Nadu', 13.001200, 80.256500, '+91-9000000004')
on conflict (id) do update set
  name = excluded.name,
  organization_type = excluded.organization_type,
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  contact_phone = excluded.contact_phone;

-- 2. KITCHENS
insert into public.kitchens (id, organization_id, name, address, latitude, longitude, timezone, active)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Green Valley Main Kitchen', 'Anna Nagar West, Chennai, Tamil Nadu', 13.082680, 80.270718, 'Asia/Kolkata', true)
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address,
  timezone = excluded.timezone,
  active = excluded.active;

-- 3. RECEIVERS
insert into public.receivers (id, organization_id, receiver_type, max_capacity, accepted_food_types, operating_hours, priority_level, verified)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'ngo', 120, '["edible_surplus","cooked_rice","vegetables","dal","chapati"]'::jsonb, '{"start":"08:00","end":"21:00"}'::jsonb, 5, true),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'hostel', 80, '["edible_surplus","cooked_rice","vegetables","dal"]'::jsonb, '{"start":"09:00","end":"22:00"}'::jsonb, 4, true),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', 'shelter', 60, '["edible_surplus","reusable"]'::jsonb, '{"start":"08:00","end":"20:00"}'::jsonb, 3, false)
on conflict (id) do update set
  receiver_type = excluded.receiver_type,
  max_capacity = excluded.max_capacity,
  accepted_food_types = excluded.accepted_food_types,
  priority_level = excluded.priority_level,
  verified = excluded.verified;

-- 4. MEALS & CONSUMPTION AUDITS
insert into public.meals (id, kitchen_id, meal_name, meal_date, meal_period, expected_consumers, planned_quantity, unit)
values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Lunch Service', current_date - 7, 'lunch', 800, 820, 'servings'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Dinner Service', current_date - 6, 'dinner', 750, 760, 'servings'),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Lunch Service', current_date - 5, 'lunch', 820, 840, 'servings'),
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'Lunch Service', current_date - 4, 'lunch', 850, 860, 'servings'),
  ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'Dinner Service', current_date - 3, 'dinner', 780, 790, 'servings'),
  ('40000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', 'Lunch Service', current_date - 2, 'lunch', 810, 825, 'servings'),
  ('40000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', 'Lunch Service', current_date - 1, 'lunch', 830, 850, 'servings'),
  ('40000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', 'Breakfast Service', current_date, 'breakfast', 520, 535, 'servings'),
  ('40000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000001', 'Lunch Service', current_date, 'lunch', 850, 875, 'servings'),
  ('40000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001', 'Dinner Service', current_date, 'dinner', 760, 780, 'servings'),
  ('40000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'Lunch Service', current_date + 1, 'lunch', 840, 865, 'servings'),
  ('40000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000001', 'Lunch Service', current_date + 2, 'lunch', 810, 835, 'servings')
on conflict (id) do nothing;

insert into public.consumption_records (meal_id, actual_consumers, prepared_quantity, consumed_quantity, leftover_quantity, recorded_at)
values
  ('40000000-0000-0000-0000-000000000001', 780, 820, 785, 35, now() - interval '7 days'),
  ('40000000-0000-0000-0000-000000000002', 740, 760, 735, 25, now() - interval '6 days'),
  ('40000000-0000-0000-0000-000000000003', 810, 840, 800, 40, now() - interval '5 days'),
  ('40000000-0000-0000-0000-000000000004', 835, 860, 820, 40, now() - interval '4 days'),
  ('40000000-0000-0000-0000-000000000005', 760, 790, 755, 35, now() - interval '3 days'),
  ('40000000-0000-0000-0000-000000000006', 795, 825, 785, 40, now() - interval '2 days'),
  ('40000000-0000-0000-0000-000000000007', 815, 850, 805, 45, now() - interval '1 day'),
  ('40000000-0000-0000-0000-000000000008', 505, 535, 510, 25, now() - interval '6 hours'),
  ('40000000-0000-0000-0000-000000000009', 840, 875, 835, 40, now() - interval '1 hour')
on conflict do nothing;

-- 5. DEMAND PREDICTIONS
insert into public.demand_predictions (id, kitchen_id, prediction_date, meal_period, predicted_consumers, recommended_quantity, predicted_surplus, confidence, model_version)
values
  ('45000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', current_date, 'dinner', 755, 778, 23, 0.88, 'mvp-baseline-v1'),
  ('45000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', current_date + 1, 'lunch', 835, 860, 25, 0.86, 'mvp-baseline-v1'),
  ('45000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', current_date + 2, 'lunch', 808, 832, 24, 0.84, 'mvp-baseline-v1')
on conflict (id) do nothing;

-- 6. SURPLUS ITEMS
insert into public.surplus_items (id, kitchen_id, source_meal_id, food_name, quantity, unit, prepared_at, reported_at, redistribution_deadline, status, category, ai_confidence, notes)
values
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000009', 'Cooked Basmati Rice & Veg Pulao', 35, 'kg', now() - interval '30 minutes', now() - interval '10 minutes', now() + interval '2 hours 30 minutes', 'active', 'edible_surplus', 0.92, 'Freshly prepared midday institutional batch. Clean temperature-controlled containers.'),
  ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000009', 'Mixed Vegetable Sambhar & Dal', 25, 'kg', now() - interval '3 hours', now() - interval '1 hour', now() + interval '45 minutes', 'active', 'edible_surplus', 0.88, 'Hot holding completed. Requires immediate priority collection transfer.'),
  ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000008', 'Assorted Cut Seasonal Fruit', 15, 'kg', now() - interval '6 hours', now() - interval '4 hours', now() - interval '90 minutes', 'expired', 'edible_surplus', 0.85, 'Distribution window lapsed. Tagged for agricultural composting diversion.'),
  ('50000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000009', 'Whole Wheat Chapati Batch', 30, 'kg', now() - interval '90 minutes', now() - interval '60 minutes', now() + interval '2 hours', 'matched', 'edible_surplus', 0.94, 'Packed in clean food-grade insulated trays. Accepted by Hope Community Centre.'),
  ('50000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000007', 'Steamed Vegetable Curry', 28, 'kg', now() - interval '2 hours 30 minutes', now() - interval '2 hours', now() + interval '2 hours', 'pickup_pending', 'edible_surplus', 0.90, 'Scheduled collection confirmed with Sunrise Student Hostel volunteer team.'),
  ('50000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000007', 'Cottage Cheese Paneer Gravy & Rice', 40, 'kg', now() - interval '26 hours', now() - interval '25 hours', now() - interval '22 hours', 'picked_up', 'edible_surplus', 0.95, 'Successfully collected by Hope Community Centre. Verified food safety criteria met.'),
  ('50000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000006', 'Dal Makhani & Steamed Rice', 36, 'kg', now() - interval '50 hours', now() - interval '49 hours', now() - interval '46 hours', 'picked_up', 'edible_surplus', 0.93, 'Delivered to Sunrise Student Hostel dining hall. Handover verified.')
on conflict (id) do update set
  food_name = excluded.food_name,
  quantity = excluded.quantity,
  status = excluded.status,
  category = excluded.category,
  redistribution_deadline = excluded.redistribution_deadline;

-- 7. REDISTRIBUTION MATCHES
insert into public.redistribution_matches (id, surplus_id, receiver_id, match_score, match_reason, status, created_at)
values
  ('55000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 92.5, '["Intake capacity 120 kg >= 35 kg", "Accepts cooked_rice & vegetables", "Distance 4.8 km", "Priority Level 5"]'::jsonb, 'recommended', now() - interval '10 minutes'),
  ('55000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 84.0, '["Intake capacity 80 kg >= 35 kg", "Accepts cooked_rice & vegetables", "Distance 8.2 km", "Priority Level 4"]'::jsonb, 'recommended', now() - interval '10 minutes'),
  ('55000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 95.0, '["Urgent Rescue Window (<= 60 min)", "Direct proximity (4.8 km)", "Accepts dal & vegetables", "Priority Level 5"]'::jsonb, 'recommended', now() - interval '1 hour'),
  ('55000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 91.0, '["Capacity matched", "Accepted category", "Approved pickup route"]'::jsonb, 'accepted', now() - interval '1 hour'),
  ('55000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', 88.0, '["Intake capacity 80 kg", "Category verified"]'::jsonb, 'accepted', now() - interval '2 hours'),
  ('55000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000001', 94.0, '["Historical completed recovery match"]'::jsonb, 'accepted', now() - interval '26 hours'),
  ('55000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000002', 87.0, '["Historical completed recovery match"]'::jsonb, 'accepted', now() - interval '50 hours')
on conflict (id) do update set
  match_score = excluded.match_score,
  status = excluded.status;

-- 8. PICKUP REQUESTS
insert into public.pickup_requests (id, surplus_id, receiver_id, status, requested_at, scheduled_at, picked_up_at, proof_image_path, notes)
values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'requested', now() - interval '45 minutes', null, null, null, 'Hope Community Centre dispatch requested collection. Awaiting kitchen timing confirmation.'),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', 'scheduled', now() - interval '1 hour 45 minutes', now() + interval '30 minutes', null, null, 'Kitchen confirmed handover timing. Sunrise volunteer driver on route.'),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000001', 'picked_up', now() - interval '26 hours', now() - interval '25 hours 30 minutes', now() - interval '24 hours', 'fixtures/sample_handover_proof_hope.jpg', 'Completed handoff. Hot insulated transport vessel used; verified temperature 64°C.'),
  ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000002', 'picked_up', now() - interval '50 hours', now() - interval '48 hours 30 minutes', now() - interval '47 hours', 'fixtures/sample_handover_proof_sunrise.jpg', 'Completed handoff. Delivered to student resident evening meal hall.'),
  ('60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'cancelled', now() - interval '4 hours 30 minutes', null, null, null, 'Cancelled: Transport breakdown before dispatch. Diverted safely to local bio-reactor.')
on conflict (id) do update set
  status = excluded.status,
  scheduled_at = excluded.scheduled_at,
  picked_up_at = excluded.picked_up_at,
  notes = excluded.notes;

-- 9. IMPACT RECORDS (Canonical 0.4 kg/meal, 2.5 kg CO2e/kg, ₹60/kg)
insert into public.impact_records (id, surplus_id, food_saved_quantity, estimated_meals_saved, estimated_waste_diverted, estimated_co2e_avoided, estimated_value_saved, recorded_at)
values
  ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000006', 40.0, 100.0, 40.0, 100.0, 2400.0, now() - interval '24 hours'),
  ('70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000007', 36.0, 90.0, 36.0, 90.0, 2160.0, now() - interval '47 hours')
on conflict (id) do update set
  food_saved_quantity = excluded.food_saved_quantity,
  estimated_meals_saved = excluded.estimated_meals_saved,
  estimated_waste_diverted = excluded.estimated_waste_diverted,
  estimated_co2e_avoided = excluded.estimated_co2e_avoided,
  estimated_value_saved = excluded.estimated_value_saved;
