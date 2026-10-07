# Database Rules, Security Contract & Business Logic

This document defines the formal database architecture, security constraints, Row Level Security (RLS) policies, and deterministic business rules for the **AI Food Waste Intelligence & Redistribution Platform**.

The database source of truth is `supabase/migrations/0001_initial_schema.sql`.

---

## 1. Database Schema & Relational Model

```text
auth.users (Supabase Auth)
    │ 1:1 (PK = id)
    ▼
public.profiles ────────────┐
    │ n:1                   │
    ▼                       ▼
public.organizations   public.notifications (user_id FK)
    │ 1:n
    ├───────────────────────┬───────────────────────┐
    ▼                       ▼                       ▼
public.kitchens         public.receivers        (Other Org Types)
    │ 1:n                   │ 1:n
    ├── public.meals        │
    │     │ 1:n             │
    │     └── public.consumption_records
    ├── public.demand_predictions
    ├── public.waste_records
    └── public.surplus_items ◄──────────────────────┐
          │ 1:n                                     │
          ├──────────────── public.redistribution_matches (surplus_id, receiver_id)
          ├──────────────── public.pickup_requests (surplus_id, receiver_id)
          └──────────────── public.impact_records (surplus_id)
```

---

## 2. PostgreSQL Enumerated Types (Enums)

The database defines 9 strict enum types:

| Enum Name | Allowed Values | Description |
|---|---|---|
| `public.app_role` | `'kitchen'`, `'receiver'`, `'admin'` | System authorization role |
| `public.organization_type` | `'kitchen'`, `'receiver'`, `'institution'`, `'ngo'`, `'processing_unit'` | Category of operating organization |
| `public.meal_period` | `'breakfast'`, `'lunch'`, `'dinner'`, `'snack'`, `'other'` | Meal planning and forecasting shift |
| `public.surplus_status` | `'active'`, `'matched'`, `'pickup_pending'`, `'picked_up'`, `'expired'`, `'recovered'`, `'disposed'` | Lifecycle state of surplus food |
| `public.surplus_category` | `'edible_surplus'`, `'reusable'`, `'organic'`, `'unsafe'`, `'unknown'` | Recovery classification category |
| `public.waste_type` | `'cooking_loss'`, `'plate_waste'`, `'surplus'`, `'spoiled'`, `'organic'`, `'other'` | Categorization of discarded food |
| `public.receiver_type` | `'ngo'`, `'shelter'`, `'hostel'`, `'community_center'`, `'other'` | Classification of receiving entity |
| `public.match_status` | `'recommended'`, `'accepted'`, `'rejected'`, `'expired'` | Status of matched redistribution recommendation |
| `public.pickup_status` | `'requested'`, `'scheduled'`, `'picked_up'`, `'cancelled'` | Status of logistics pickup execution |

---

## 3. Table Definitions & Constraints

### 3.1 `organizations`
- **Columns:**
  - `id` (uuid, PK, default `gen_random_uuid()`)
  - `name` (text, not null)
  - `organization_type` (`public.organization_type`, not null)
  - `address` (text, nullable)
  - `latitude` (numeric(9,6), nullable)
  - `longitude` (numeric(9,6), nullable)
  - `contact_phone` (text, nullable)
  - `created_at` (timestamptz, not null, default `now()`)

### 3.2 `profiles`
- **Columns:**
  - `id` (uuid, PK, references `auth.users(id)` on delete cascade)
  - `full_name` (text, not null)
  - `email` (text, nullable)
  - `phone` (text, nullable)
  - `role` (`public.app_role`, not null)
  - `organization_id` (uuid, FK references `public.organizations(id)` on delete set null)
  - `created_at` (timestamptz, not null, default `now()`)
  - `updated_at` (timestamptz, not null, default `now()`)
- **Indexes:** `idx_profiles_org` on (`organization_id`)

### 3.3 `kitchens`
- **Columns:**
  - `id` (uuid, PK, default `gen_random_uuid()`)
  - `organization_id` (uuid, not null, FK references `public.organizations(id)` on delete cascade)
  - `name` (text, not null)
  - `address` (text, nullable)
  - `latitude` (numeric(9,6), nullable)
  - `longitude` (numeric(9,6), nullable)
  - `timezone` (text, not null, default `'Asia/Kolkata'`)
  - `active` (boolean, not null, default `true`)
  - `created_at` (timestamptz, not null, default `now()`)
  - `updated_at` (timestamptz, not null, default `now()`)
- **Indexes:** `idx_kitchens_org` on (`organization_id`)

### 3.4 `meals`
- **Columns:**
  - `id` (uuid, PK, default `gen_random_uuid()`)
  - `kitchen_id` (uuid, not null, FK references `public.kitchens(id)` on delete cascade)
  - `meal_name` (text, not null)
  - `meal_date` (date, not null)
  - `meal_period` (`public.meal_period`, not null)
  - `expected_consumers` (integer, not null, check `expected_consumers >= 0`)
  - `planned_quantity` (numeric(12,2), not null, check `planned_quantity >= 0`)
  - `unit` (text, not null, default `'servings'`)
  - `created_at` (timestamptz, not null, default `now()`)
- **Indexes:** `idx_meals_kitchen_date` on (`kitchen_id`, `meal_date desc`)

### 3.5 `consumption_records`
- **Columns:**
  - `id` (uuid, PK, default `gen_random_uuid()`)
  - `meal_id` (uuid, not null, FK references `public.meals(id)` on delete cascade)
  - `actual_consumers` (integer, not null, check `actual_consumers >= 0`)
  - `prepared_quantity` (numeric(12,2), not null, check `prepared_quantity >= 0`)
  - `consumed_quantity` (numeric(12,2), not null, check `consumed_quantity >= 0`)
  - `leftover_quantity` (numeric(12,2), not null, check `leftover_quantity >= 0`)
  - `recorded_at` (timestamptz, not null, default `now()`)
- **Indexes:** `idx_consumption_meal` on (`meal_id`)

### 3.6 `demand_predictions`
- **Columns:**
  - `id` (uuid, PK, default `gen_random_uuid()`)
  - `kitchen_id` (uuid, not null, FK references `public.kitchens(id)` on delete cascade)
  - `prediction_date` (date, not null)
  - `meal_period` (`public.meal_period`, not null)
  - `predicted_consumers` (integer, not null, check `predicted_consumers >= 0`)
  - `recommended_quantity` (numeric(12,2), not null, check `recommended_quantity >= 0`)
  - `predicted_surplus` (numeric(12,2), not null, default 0, check `predicted_surplus >= 0`)
  - `confidence` (numeric(5,4), check `confidence >= 0 and confidence <= 1`)
  - `model_version` (text, not null, default `'mvp-baseline-v1'`)
  - `created_at` (timestamptz, not null, default `now()`)
- **Indexes:** `idx_predictions_kitchen_date` on (`kitchen_id`, `prediction_date desc`)

### 3.7 `surplus_items`
- **Columns:**
  - `id` (uuid, PK, default `gen_random_uuid()`)
  - `kitchen_id` (uuid, not null, FK references `public.kitchens(id)` on delete cascade)
  - `source_meal_id` (uuid, nullable, FK references `public.meals(id)` on delete set null)
  - `food_name` (text, not null)
  - `quantity` (numeric(12,2), not null, check `quantity > 0`)
  - `unit` (text, not null, default `'kg'`)
  - `prepared_at` (timestamptz, nullable)
  - `reported_at` (timestamptz, not null, default `now()`)
  - `redistribution_deadline` (timestamptz, nullable)
  - `status` (`public.surplus_status`, not null, default `'active'`)
  - `category` (`public.surplus_category`, not null, default `'unknown'`)
  - `ai_confidence` (numeric(5,4), nullable, check `ai_confidence >= 0 and ai_confidence <= 1`)
  - `image_path` (text, nullable)
  - `notes` (text, nullable)
  - `created_at` (timestamptz, not null, default `now()`)
- **Indexes:**
  - `idx_surplus_kitchen_status` on (`kitchen_id`, `status`)
  - `idx_surplus_deadline` on (`redistribution_deadline`)

### 3.8 `waste_records`
- **Columns:**
  - `id` (uuid, PK, default `gen_random_uuid()`)
  - `kitchen_id` (uuid, not null, FK references `public.kitchens(id)` on delete cascade)
  - `food_name` (text, not null)
  - `quantity` (numeric(12,2), not null, check `quantity > 0`)
  - `unit` (text, not null, default `'kg'`)
  - `waste_type` (`public.waste_type`, not null)
  - `reason` (text, nullable)
  - `recorded_at` (timestamptz, not null, default `now()`)
- **Indexes:** `idx_waste_kitchen_recorded` on (`kitchen_id`, `recorded_at desc`)

### 3.9 `receivers`
- **Columns:**
  - `id` (uuid, PK, default `gen_random_uuid()`)
  - `organization_id` (uuid, not null, FK references `public.organizations(id)` on delete cascade)
  - `receiver_type` (`public.receiver_type`, not null)
  - `max_capacity` (numeric(12,2), not null, check `max_capacity >= 0`)
  - `accepted_food_types` (jsonb, not null, default `'[]'::jsonb`)
  - `operating_hours` (jsonb, not null, default `'{}'::jsonb`)
  - `priority_level` (integer, not null, default 1, check `priority_level between 1 and 5`)
  - `verified` (boolean, not null, default `false`)
  - `created_at` (timestamptz, not null, default `now()`)
  - `updated_at` (timestamptz, not null, default `now()`)
- **Indexes:** `idx_receivers_org` on (`organization_id`)

### 3.10 `redistribution_matches`
- **Columns:**
  - `id` (uuid, PK, default `gen_random_uuid()`)
  - `surplus_id` (uuid, not null, FK references `public.surplus_items(id)` on delete cascade)
  - `receiver_id` (uuid, not null, FK references `public.receivers(id)` on delete cascade)
  - `match_score` (numeric(5,2), not null, check `match_score >= 0 and match_score <= 100`)
  - `match_reason` (jsonb, not null, default `'[]'::jsonb`)
  - `status` (`public.match_status`, not null, default `'recommended'`)
  - `created_at` (timestamptz, not null, default `now()`)
- **Constraints & Indexes:**
  - `UNIQUE (surplus_id, receiver_id)`
  - `idx_matches_surplus_status` on (`surplus_id`, `status`)
  - `idx_matches_receiver_status` on (`receiver_id`, `status`)

### 3.11 `pickup_requests`
- **Columns:**
  - `id` (uuid, PK, default `gen_random_uuid()`)
  - `surplus_id` (uuid, not null, FK references `public.surplus_items(id)` on delete cascade)
  - `receiver_id` (uuid, not null, FK references `public.receivers(id)` on delete cascade)
  - `requested_at` (timestamptz, not null, default `now()`)
  - `scheduled_at` (timestamptz, nullable)
  - `picked_up_at` (timestamptz, nullable)
  - `status` (`public.pickup_status`, not null, default `'requested'`)
  - `proof_image_path` (text, nullable)
  - `notes` (text, nullable)
- **Indexes:**
  - `idx_pickups_receiver_status` on (`receiver_id`, `status`)
  - `idx_pickups_surplus_status` on (`surplus_id`, `status`)

### 3.12 `impact_records`
- **Columns:**
  - `id` (uuid, PK, default `gen_random_uuid()`)
  - `surplus_id` (uuid, not null, FK references `public.surplus_items(id)` on delete cascade)
  - `food_saved_quantity` (numeric(12,2), not null, check `food_saved_quantity >= 0`)
  - `estimated_meals_saved` (numeric(12,2), not null, default 0, check `estimated_meals_saved >= 0`)
  - `estimated_waste_diverted` (numeric(12,2), not null, default 0, check `estimated_waste_diverted >= 0`)
  - `estimated_co2e_avoided` (numeric(12,2), nullable)
  - `estimated_value_saved` (numeric(12,2), nullable)
  - `recorded_at` (timestamptz, not null, default `now()`)
- **Indexes:** `idx_impact_surplus` on (`surplus_id`)

### 3.13 `notifications`
- **Columns:**
  - `id` (uuid, PK, default `gen_random_uuid()`)
  - `user_id` (uuid, not null, FK references `auth.users(id)` on delete cascade)
  - `notification_type` (text, not null)
  - `title` (text, not null)
  - `message` (text, not null)
  - `read` (boolean, not null, default `false`)
  - `created_at` (timestamptz, not null, default `now()`)
- **Indexes:** `idx_notifications_user_read` on (`user_id`, `read`, `created_at desc`)

---

## 4. Authentication, Triggers & Security Definer Functions

### 4.1 Profile Auto-Creation Trigger & Initial User State
Upon signup in Supabase Auth, the `on_auth_user_created` trigger fires `public.handle_new_user()`:
```sql
insert into public.profiles (id, full_name, email, role)
values (
  new.id,
  coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'),
  new.email,
  'kitchen'::public.app_role
)
on conflict (id) do nothing;
```
- **Initial State:** A newly registered user has `organization_id = NULL`. They are unassociated with any operational organization until an administrator explicitly provisions and links them.
- **Self-Selection Blocked:** Users cannot choose their own `role` or `organization_id` during registration or onboarding.

### 4.2 Security Definer Helper Functions
To avoid recurring sub-select overhead and safely evaluate policies, 6 security-definer helper functions operate under `search_path = public`:
1. `public.current_profile_role()`: Returns `profiles.role` for `auth.uid()`.
2. `public.current_org_id()`: Returns `profiles.organization_id` for `auth.uid()`.
3. `public.is_admin()`: Returns `true` if current user role is `'admin'`.
4. `public.is_org_member(target_org uuid)`: Returns `true` if user is admin or belongs to `target_org`.
5. `public.can_access_kitchen(target_kitchen uuid)`: Returns `true` if user is admin or belongs to the organization that owns `target_kitchen`.
6. `public.can_access_surplus(target_surplus uuid)`: Returns `true` if:
   - User is `admin`, OR
   - User's organization owns the kitchen reporting the surplus, OR
   - User's organization owns a receiver matched to that surplus in `redistribution_matches`.

### 4.3 Profile Self-Update Restrictions & RLS Enforcement
The RLS policy `users can update own profile` strictly forbids changing `role` or `organization_id` directly from client-side calls:
```sql
create policy "users can update own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and role = public.current_profile_role()
  and organization_id is not distinct from public.current_org_id()
);
```

### 4.4 Admin-Only Organization & Role Assignment Security Model
Organization linkage and role promotion/demotion are strictly **ADMIN-ONLY** administrative operations:
1. **No Self-Assignment:** A normal kitchen or receiver user must never be able to call any endpoint or database function that assigns themselves an organization or elevated role.
2. **Explicit Admin Verification:** Any organization/role assignment endpoint must:
   - Require an authenticated Supabase session.
   - Verify that the calling user's profile has `role = 'admin'`.
   - Verify that the target user profile exists.
   - Perform the privileged update strictly on the trusted server backend.
   - Never expose or pass elevated credentials to the browser client.
3. **Key Architecture & Credential Isolation:**
   - **Frontend Publishable Key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`):** Public key used by browser clients alongside `NEXT_PUBLIC_SUPABASE_URL`, strictly bound and restricted by Postgres RLS policies and user authentication sessions. It cannot bypass RLS or modify immutable profile columns (`role`, `organization_id`).
   - **Server-Only Secret Key (`SUPABASE_SECRET_KEY`):** Elevated secret credential residing exclusively within trusted server runtime environments (Next.js Route Handlers / Server Actions). It is never sent to, bundled in, or accessible by the browser client. All privileged administrative operations (such as organization and role provisioning) must execute via this trusted server client after validating admin authorization.

---

## 5. Storage Buckets & Policies

Supabase Storage is configured with two **private** buckets:

| Bucket Name | Target Object | Max Size | Allowed MIME Types | Storage Path Convention |
|---|---|---|---|---|
| `food-images` | Photos of reported food surplus | 5 MB | `image/jpeg`, `image/png`, `image/webp` | `kitchens/{kitchen_id}/surplus/{surplus_id}/{filename}` |
| `pickup-proofs` | Proof photos taken during pickup handover | 5 MB | `image/jpeg`, `image/png`, `image/webp` | `receivers/{receiver_id}/pickups/{pickup_id}/{filename}` |

### Access Rules:
- Direct public URL access is blocked (buckets are private).
- Uploads and read URLs must be generated server-side or authorized via Supabase Storage signed URLs.
- Only authenticated users associated with the kitchen or matched receiver may request access to an image.

---

## 6. Deterministic Business Rules & Engine Formulas

### 6.1 Baseline Demand Prediction Engine
The demand prediction model is deterministic and uses historical consumption averages:
$$\text{Weighted Average} = (0.50 \times \text{recent\_same\_weekday\_avg}) + (0.30 \times \text{recent\_7\_day\_avg}) + (0.20 \times \text{same\_meal\_period\_avg})$$

- **Recommended Quantity:** Calculated as $\text{Predicted Consumers} \times \text{Standard Serving Size}$.
- **Surplus Estimate:** Calculated as $\max(0, \text{Planned Quantity} - \text{Recommended Quantity})$.

### 6.2 AI Advisory Classification vs Deterministic Decision
- **AI Role (Perception):** Gemini inspects the uploaded image and notes to return advisory structured JSON:
  ```json
  {
    "food_type": "Cooked Rice",
    "suggested_category": "edible_surplus",
    "visible_condition": "Fresh, steam visible, intact packaging",
    "confidence": 0.92,
    "advisory_notes": "No visual signs of spoilage"
  }
  ```
- **Deterministic Authority:**
  1. AI outputs are **never** treated as food-safety certification.
  2. The kitchen manager must confirm or modify the food item and declared category.
  3. The system checks:
     - Is category equal to `edible_surplus`? If no $\rightarrow$ route to secondary reuse (`reusable`), compost (`organic`), or disposal (`unsafe`).
     - Is `now() < redistribution_deadline`? If expired $\rightarrow$ prevent matching.

### 6.3 Deterministic Redistribution Matching Engine
When a surplus item is marked eligible for redistribution, candidate verified receivers within range are scored from 0 to 100:

$$\text{Match Score} = (0.40 \times S_{\text{dist}}) + (0.25 \times S_{\text{qty}}) + (0.20 \times S_{\text{urgency}}) + (0.10 \times S_{\text{capacity}}) + (0.05 \times S_{\text{priority}})$$

Where normalized sub-scores ($0-100$) are:
1. **Distance Score ($S_{\text{dist}}$):**
   - $d \le 2\text{ km} \rightarrow 100$
   - $2\text{ km} < d \le 10\text{ km} \rightarrow 100 - ((d - 2) \times 10)$
   - $d > 10\text{ km} \rightarrow \max(0, 20 - (d - 10))$
2. **Quantity Score ($S_{\text{qty}}$):**
   - $\text{ratio} = \frac{\text{Surplus Quantity}}{\text{Receiver Max Capacity}}$
   - If $\text{ratio} \le 1.0 \rightarrow 100 \times \text{ratio}$
   - If $\text{ratio} > 1.0 \rightarrow \max(0, 100 - ((\text{ratio} - 1.0) \times 100))$
3. **Urgency Score ($S_{\text{urgency}}$):**
   - Remaining time before deadline:
     - $< 1\text{ hour} \rightarrow 100$ (Highest urgency)
     - $1 - 3\text{ hours} \rightarrow 75$
     - $> 3\text{ hours} \rightarrow 50$
4. **Capacity Score ($S_{\text{capacity}}$):**
   - Score proportional to receiver available capacity headroom.
5. **Priority Score ($S_{\text{priority}}$):**
   - Normalized from receiver `priority_level` ($1-5 \rightarrow 20-100$).

### 6.4 Food Rescue Clock & Urgency States
$$\text{Time Remaining} = \text{redistribution\_deadline} - \text{now()}$$
- **Normal Window:** $> 2 \text{ hours}$ remaining (Green badge).
- **Urgent Window:** $\le 2 \text{ hours}$ remaining (Amber/Red pulsing badge).
- **Expired State:** $\le 0 \text{ minutes}$ (Item status transitions to `expired` or triggers secondary recovery).

### 6.5 Impact Calculation Formulas
Upon completion of pickup (`pickup_status = 'picked_up'`):
- $\text{Food Saved (kg)} = \text{Surplus Quantity}$
- $\text{Estimated Meals Saved} = \frac{\text{Food Saved (kg)}}{0.4\text{ kg per meal}}$
- $\text{Estimated Waste Diverted (kg)} = \text{Food Saved (kg)}$
- $\text{Estimated }\text{CO}_2\text{e Avoided (kg)} = \text{Food Saved (kg)} \times 2.5\text{ kg }\text{CO}_2\text{e/kg food}$
- $\text{Estimated Value Saved (INR)} = \text{Food Saved (kg)} \times ₹60/\text{kg}$
