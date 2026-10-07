-- Demo seed data for local/development use only.
-- Do not use these records as production data.

insert into public.organizations (id, name, organization_type, address, latitude, longitude, contact_phone)
values
  ('10000000-0000-0000-0000-000000000001', 'Green Valley Institutional Kitchen', 'kitchen', 'Chennai, Tamil Nadu', 13.082680, 80.270718, '+91-9000000001'),
  ('10000000-0000-0000-0000-000000000002', 'Hope Community Centre', 'ngo', 'Chennai, Tamil Nadu', 13.067439, 80.237617, '+91-9000000002'),
  ('10000000-0000-0000-0000-000000000003', 'Sunrise Student Hostel', 'receiver', 'Chennai, Tamil Nadu', 13.056946, 80.242960, '+91-9000000003')
on conflict (id) do nothing;

insert into public.kitchens (id, organization_id, name, address, latitude, longitude)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Green Valley Main Kitchen', 'Chennai, Tamil Nadu', 13.082680, 80.270718)
on conflict (id) do nothing;

insert into public.receivers (id, organization_id, receiver_type, max_capacity, accepted_food_types, operating_hours, priority_level, verified)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'ngo', 100, '["cooked_rice","vegetables","dal","chapati"]'::jsonb, '{"start":"08:00","end":"20:00"}'::jsonb, 5, true),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'hostel', 60, '["cooked_rice","vegetables","dal"]'::jsonb, '{"start":"09:00","end":"22:00"}'::jsonb, 3, true)
on conflict (id) do nothing;

insert into public.meals (id, kitchen_id, meal_name, meal_date, meal_period, expected_consumers, planned_quantity, unit)
values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Lunch', current_date, 'lunch', 820, 850, 'servings')
on conflict (id) do nothing;

insert into public.consumption_records (meal_id, actual_consumers, prepared_quantity, consumed_quantity, leftover_quantity)
values
  ('40000000-0000-0000-0000-000000000001', 790, 850, 805, 45)
on conflict do nothing;

insert into public.demand_predictions (kitchen_id, prediction_date, meal_period, predicted_consumers, recommended_quantity, predicted_surplus, confidence)
values
  ('20000000-0000-0000-0000-000000000001', current_date + 1, 'lunch', 805, 835, 30, 0.82);

insert into public.surplus_items (id, kitchen_id, source_meal_id, food_name, quantity, unit, prepared_at, redistribution_deadline, status, category, ai_confidence, notes)
values
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Cooked Rice', 32, 'kg', now() - interval '35 minutes', now() + interval '2 hours 25 minutes', 'active', 'edible_surplus', 0.91, 'Demo surplus record')
on conflict (id) do nothing;
