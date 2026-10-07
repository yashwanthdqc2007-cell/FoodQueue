-- Food Waste Intelligence & Redistribution Platform
-- Initial schema migration
-- PostgreSQL / Supabase

create extension if not exists pgcrypto;

-- ============================================================
-- ENUMS
-- ============================================================

do $$ begin
  create type public.app_role as enum ('kitchen', 'receiver', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organization_type as enum ('kitchen', 'receiver', 'institution', 'ngo', 'processing_unit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.meal_period as enum ('breakfast', 'lunch', 'dinner', 'snack', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.surplus_status as enum ('active', 'matched', 'pickup_pending', 'picked_up', 'expired', 'recovered', 'disposed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.surplus_category as enum ('edible_surplus', 'reusable', 'organic', 'unsafe', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.waste_type as enum ('cooking_loss', 'plate_waste', 'surplus', 'spoiled', 'organic', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.receiver_type as enum ('ngo', 'shelter', 'hostel', 'community_center', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.match_status as enum ('recommended', 'accepted', 'rejected', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pickup_status as enum ('requested', 'scheduled', 'picked_up', 'cancelled');
exception when duplicate_object then null; end $$;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- CORE TABLES
-- ============================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_type public.organization_type not null,
  address text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  contact_phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  role public.app_role not null,
  organization_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kitchens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  timezone text not null default 'Asia/Kolkata',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  meal_name text not null,
  meal_date date not null,
  meal_period public.meal_period not null,
  expected_consumers integer not null check (expected_consumers >= 0),
  planned_quantity numeric(12,2) not null check (planned_quantity >= 0),
  unit text not null default 'servings',
  created_at timestamptz not null default now()
);

create table if not exists public.consumption_records (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  actual_consumers integer not null check (actual_consumers >= 0),
  prepared_quantity numeric(12,2) not null check (prepared_quantity >= 0),
  consumed_quantity numeric(12,2) not null check (consumed_quantity >= 0),
  leftover_quantity numeric(12,2) not null check (leftover_quantity >= 0),
  recorded_at timestamptz not null default now()
);

create table if not exists public.demand_predictions (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  prediction_date date not null,
  meal_period public.meal_period not null,
  predicted_consumers integer not null check (predicted_consumers >= 0),
  recommended_quantity numeric(12,2) not null check (recommended_quantity >= 0),
  predicted_surplus numeric(12,2) not null default 0 check (predicted_surplus >= 0),
  confidence numeric(5,4) check (confidence >= 0 and confidence <= 1),
  model_version text not null default 'mvp-baseline-v1',
  created_at timestamptz not null default now()
);

create table if not exists public.surplus_items (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  source_meal_id uuid references public.meals(id) on delete set null,
  food_name text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit text not null default 'kg',
  prepared_at timestamptz,
  reported_at timestamptz not null default now(),
  redistribution_deadline timestamptz,
  status public.surplus_status not null default 'active',
  category public.surplus_category not null default 'unknown',
  ai_confidence numeric(5,4) check (ai_confidence >= 0 and ai_confidence <= 1),
  image_path text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.waste_records (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  food_name text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit text not null default 'kg',
  waste_type public.waste_type not null,
  reason text,
  recorded_at timestamptz not null default now()
);

create table if not exists public.receivers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  receiver_type public.receiver_type not null,
  max_capacity numeric(12,2) not null check (max_capacity >= 0),
  accepted_food_types jsonb not null default '[]'::jsonb,
  operating_hours jsonb not null default '{}'::jsonb,
  priority_level integer not null default 1 check (priority_level between 1 and 5),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.redistribution_matches (
  id uuid primary key default gen_random_uuid(),
  surplus_id uuid not null references public.surplus_items(id) on delete cascade,
  receiver_id uuid not null references public.receivers(id) on delete cascade,
  match_score numeric(5,2) not null check (match_score >= 0 and match_score <= 100),
  match_reason jsonb not null default '[]'::jsonb,
  status public.match_status not null default 'recommended',
  created_at timestamptz not null default now(),
  unique (surplus_id, receiver_id)
);

create table if not exists public.pickup_requests (
  id uuid primary key default gen_random_uuid(),
  surplus_id uuid not null references public.surplus_items(id) on delete cascade,
  receiver_id uuid not null references public.receivers(id) on delete cascade,
  requested_at timestamptz not null default now(),
  scheduled_at timestamptz,
  picked_up_at timestamptz,
  status public.pickup_status not null default 'requested',
  proof_image_path text,
  notes text
);

create table if not exists public.impact_records (
  id uuid primary key default gen_random_uuid(),
  surplus_id uuid not null references public.surplus_items(id) on delete cascade,
  food_saved_quantity numeric(12,2) not null check (food_saved_quantity >= 0),
  estimated_meals_saved numeric(12,2) not null default 0 check (estimated_meals_saved >= 0),
  estimated_waste_diverted numeric(12,2) not null default 0 check (estimated_waste_diverted >= 0),
  estimated_co2e_avoided numeric(12,2),
  estimated_value_saved numeric(12,2),
  recorded_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists kitchens_set_updated_at on public.kitchens;
create trigger kitchens_set_updated_at
before update on public.kitchens
for each row execute function public.set_updated_at();

drop trigger if exists receivers_set_updated_at on public.receivers;
create trigger receivers_set_updated_at
before update on public.receivers
for each row execute function public.set_updated_at();

-- ============================================================
-- AUTH HELPER FUNCTIONS
-- Security-definer helpers avoid repeating profile lookups in policies.
-- ============================================================

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = (select auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'admin', false);
$$;

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.current_org_id() = target_org;
$$;

create or replace function public.can_access_kitchen(target_kitchen uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
      or exists (
          select 1
          from public.kitchens k
          where k.id = target_kitchen
            and k.organization_id = public.current_org_id()
      );
$$;

create or replace function public.can_access_surplus(target_surplus uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
      or exists (
          select 1
          from public.surplus_items s
          join public.kitchens k on k.id = s.kitchen_id
          where s.id = target_surplus
            and k.organization_id = public.current_org_id()
      )
      or exists (
          select 1
          from public.redistribution_matches rm
          join public.receivers r on r.id = rm.receiver_id
          where rm.surplus_id = target_surplus
            and r.organization_id = public.current_org_id()
      );
$$;

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_profiles_org on public.profiles(organization_id);
create index if not exists idx_kitchens_org on public.kitchens(organization_id);
create index if not exists idx_meals_kitchen_date on public.meals(kitchen_id, meal_date desc);
create index if not exists idx_consumption_meal on public.consumption_records(meal_id);
create index if not exists idx_predictions_kitchen_date on public.demand_predictions(kitchen_id, prediction_date desc);
create index if not exists idx_surplus_kitchen_status on public.surplus_items(kitchen_id, status);
create index if not exists idx_surplus_deadline on public.surplus_items(redistribution_deadline);
create index if not exists idx_waste_kitchen_recorded on public.waste_records(kitchen_id, recorded_at desc);
create index if not exists idx_receivers_org on public.receivers(organization_id);
create index if not exists idx_matches_surplus_status on public.redistribution_matches(surplus_id, status);
create index if not exists idx_matches_receiver_status on public.redistribution_matches(receiver_id, status);
create index if not exists idx_pickups_receiver_status on public.pickup_requests(receiver_id, status);
create index if not exists idx_pickups_surplus_status on public.pickup_requests(surplus_id, status);
create index if not exists idx_impact_surplus on public.impact_records(surplus_id);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read, created_at desc);

-- ============================================================
-- RLS
-- Enable RLS on all public application tables.
-- ============================================================

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.kitchens enable row level security;
alter table public.meals enable row level security;
alter table public.consumption_records enable row level security;
alter table public.demand_predictions enable row level security;
alter table public.surplus_items enable row level security;
alter table public.waste_records enable row level security;
alter table public.receivers enable row level security;
alter table public.redistribution_matches enable row level security;
alter table public.pickup_requests enable row level security;
alter table public.impact_records enable row level security;
alter table public.notifications enable row level security;

-- Organizations
create policy "org members can view organization"
on public.organizations for select to authenticated
using (public.is_org_member(id));

create policy "admins manage organizations"
on public.organizations for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Profiles
create policy "users can view own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_org_member(organization_id));

create policy "users can update own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and role = public.current_profile_role()
  and organization_id is not distinct from public.current_org_id()
);

create policy "admins manage profiles"
on public.profiles for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Kitchens
create policy "org members can view kitchens"
on public.kitchens for select to authenticated
using (public.is_org_member(organization_id));

create policy "kitchen users can insert kitchens"
on public.kitchens for insert to authenticated
with check (public.is_admin() or (public.current_profile_role() = 'kitchen' and public.is_org_member(organization_id)));

create policy "kitchen users can update kitchens"
on public.kitchens for update to authenticated
using (public.is_admin() or (public.current_profile_role() = 'kitchen' and public.is_org_member(organization_id)))
with check (public.is_admin() or (public.current_profile_role() = 'kitchen' and public.is_org_member(organization_id)));

-- Meals
create policy "kitchen org can view meals"
on public.meals for select to authenticated
using (public.can_access_kitchen(kitchen_id));

create policy "kitchen users can create meals"
on public.meals for insert to authenticated
with check (public.is_admin() or (public.current_profile_role() = 'kitchen' and public.can_access_kitchen(kitchen_id)));

create policy "kitchen users can update meals"
on public.meals for update to authenticated
using (public.is_admin() or (public.current_profile_role() = 'kitchen' and public.can_access_kitchen(kitchen_id)))
with check (public.is_admin() or (public.current_profile_role() = 'kitchen' and public.can_access_kitchen(kitchen_id)));

-- Consumption
create policy "kitchen org can view consumption"
on public.consumption_records for select to authenticated
using (exists (select 1 from public.meals m where m.id = meal_id and public.can_access_kitchen(m.kitchen_id)));

create policy "kitchen users can manage consumption"
on public.consumption_records for insert to authenticated
with check (public.current_profile_role() = 'kitchen' and exists (select 1 from public.meals m where m.id = meal_id and public.can_access_kitchen(m.kitchen_id)));

create policy "kitchen users can update consumption"
on public.consumption_records for update to authenticated
using (public.current_profile_role() = 'kitchen' and exists (select 1 from public.meals m where m.id = meal_id and public.can_access_kitchen(m.kitchen_id)))
with check (public.current_profile_role() = 'kitchen' and exists (select 1 from public.meals m where m.id = meal_id and public.can_access_kitchen(m.kitchen_id)));

-- Demand predictions
create policy "kitchen org can view predictions"
on public.demand_predictions for select to authenticated
using (public.can_access_kitchen(kitchen_id));

create policy "kitchen users can create predictions"
on public.demand_predictions for insert to authenticated
with check (public.current_profile_role() = 'kitchen' and public.can_access_kitchen(kitchen_id));

-- Surplus
create policy "participants can view surplus"
on public.surplus_items for select to authenticated
using (public.can_access_surplus(id));

create policy "kitchen users can create surplus"
on public.surplus_items for insert to authenticated
with check (public.current_profile_role() = 'kitchen' and public.can_access_kitchen(kitchen_id));

create policy "kitchen users can update surplus"
on public.surplus_items for update to authenticated
using (public.is_admin() or (public.current_profile_role() = 'kitchen' and public.can_access_kitchen(kitchen_id)))
with check (public.is_admin() or (public.current_profile_role() = 'kitchen' and public.can_access_kitchen(kitchen_id)));

-- Waste
create policy "kitchen org can view waste"
on public.waste_records for select to authenticated
using (public.can_access_kitchen(kitchen_id));

create policy "kitchen users can create waste"
on public.waste_records for insert to authenticated
with check (public.current_profile_role() = 'kitchen' and public.can_access_kitchen(kitchen_id));

-- Receivers
create policy "org members can view receivers"
on public.receivers for select to authenticated
using (public.is_org_member(organization_id) or public.is_admin());

create policy "authenticated users can discover verified receivers"
on public.receivers for select to authenticated
using (verified = true or public.is_org_member(organization_id) or public.is_admin());

create policy "receiver users can insert receiver"
on public.receivers for insert to authenticated
with check (public.is_admin() or (public.current_profile_role() = 'receiver' and public.is_org_member(organization_id)));

create policy "receiver users can update receiver"
on public.receivers for update to authenticated
using (public.is_admin() or (public.current_profile_role() = 'receiver' and public.is_org_member(organization_id)))
with check (public.is_admin() or (public.current_profile_role() = 'receiver' and public.is_org_member(organization_id)));

-- Matches
create policy "participants can view matches"
on public.redistribution_matches for select to authenticated
using (
  public.can_access_surplus(surplus_id)
  or exists (
    select 1 from public.receivers r
    where r.id = receiver_id and public.is_org_member(r.organization_id)
  )
);

create policy "server/admin can create matches"
on public.redistribution_matches for insert to authenticated
with check (public.is_admin() or public.can_access_surplus(surplus_id));

create policy "participants can update matches"
on public.redistribution_matches for update to authenticated
using (
  public.is_admin()
  or public.can_access_surplus(surplus_id)
  or exists (select 1 from public.receivers r where r.id = receiver_id and public.is_org_member(r.organization_id))
)
with check (
  public.is_admin()
  or public.can_access_surplus(surplus_id)
  or exists (select 1 from public.receivers r where r.id = receiver_id and public.is_org_member(r.organization_id))
);

-- Pickups
create policy "participants can view pickups"
on public.pickup_requests for select to authenticated
using (
  public.can_access_surplus(surplus_id)
  or exists (select 1 from public.receivers r where r.id = receiver_id and public.is_org_member(r.organization_id))
);

create policy "participants can create pickups"
on public.pickup_requests for insert to authenticated
with check (
  public.can_access_surplus(surplus_id)
  or exists (select 1 from public.receivers r where r.id = receiver_id and public.is_org_member(r.organization_id))
);

create policy "participants can update pickups"
on public.pickup_requests for update to authenticated
using (
  public.is_admin()
  or public.can_access_surplus(surplus_id)
  or exists (select 1 from public.receivers r where r.id = receiver_id and public.is_org_member(r.organization_id))
)
with check (
  public.is_admin()
  or public.can_access_surplus(surplus_id)
  or exists (select 1 from public.receivers r where r.id = receiver_id and public.is_org_member(r.organization_id))
);

-- Impact
create policy "participants can view impact"
on public.impact_records for select to authenticated
using (public.can_access_surplus(surplus_id));

create policy "participants can create impact"
on public.impact_records for insert to authenticated
with check (public.can_access_surplus(surplus_id));

-- Notifications
create policy "users can view own notifications"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

create policy "users can update own notifications"
on public.notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- ============================================================
-- PROFILE AUTO-CREATION TRIGGER
-- Only creates a minimal profile after signup when metadata exists.
-- The application can complete onboarding later.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'),
    new.email,
    'kitchen'::public.app_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ============================================================
-- COMMENTS / DESIGN NOTES
-- ============================================================

comment on table public.surplus_items is 'Recoverable food surplus and waste events reported by kitchens.';
comment on column public.surplus_items.ai_confidence is 'Advisory AI confidence only; never a food-safety determination.';
comment on table public.redistribution_matches is 'Deterministic ranking results generated by the matching engine.';
comment on table public.demand_predictions is 'MVP baseline predictions; model_version enables future model replacement.';
