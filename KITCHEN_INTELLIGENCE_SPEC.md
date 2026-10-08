# Kitchen Intelligence Module Specification

This document defines the complete technical, operational, and mathematical specification for the **Kitchen Intelligence Module** (`food-rescue-ai`).

The authoritative source of truth for the database schema and security policies is `supabase/migrations/0001_initial_schema.sql` and `DATABASE_RULES.md`.

---

## 1. Module Objective & Scope

The Kitchen Intelligence Module coordinates institutional kitchen meal planning, predictive demand estimation, post-service consumption auditing, and surplus handoff:

```text
MEAL CREATION / PLANNING
           ↓
DEMAND PREDICTION (Deterministic Baseline)
           ↓
RECOMMENDED PREPARATION (With Safety Buffer)
           ↓
SERVICE EXECUTION & CONSUMPTION AUDIT
           ↓
SURPLUS RECOVERY HANDOFF (Boundary to Redistribution)
```

> [!IMPORTANT]
> **Zero External ML / Deterministic Engine:** Demand forecasting in this module is 100% deterministic arithmetic based on historical consumption records. It does **NOT** call Gemini, neural networks, or external AI forecasting APIs.

---

## 2. Database Mapping & Access Control Matrix

Using the actual schema from `supabase/migrations/0001_initial_schema.sql`, the Kitchen Intelligence module interacts with five core tables. No new tables or schema alterations are required.

### 2.1 Table-by-Table Specifications

#### 1. `public.kitchens`
- **Purpose:** Represents an operating institutional kitchen or cooking facility linked to an organization.
- **Relevant Fields:**
  - `id` (`uuid`, PK, default `gen_random_uuid()`)
  - `organization_id` (`uuid`, FK references `organizations(id)` on delete cascade)
  - `name` (`text`, not null)
  - `address` (`text`, nullable)
  - `latitude` (`numeric(9,6)`, nullable)
  - `longitude` (`numeric(9,6)`, nullable)
  - `timezone` (`text`, not null, default `'Asia/Kolkata'`)
  - `active` (`boolean`, not null, default `true`)
  - `created_at` (`timestamptz`, not null, default `now()`)
  - `updated_at` (`timestamptz`, not null, default `now()`)
- **Relationships:**
  - Belongs to `organizations` (N:1 via `organization_id`)
  - Has many `meals` (1:N)
  - Has many `demand_predictions` (1:N)
  - Has many `surplus_items` (1:N)
  - Has many `waste_records` (1:N)
- **RLS Access Authority:**
  - **Who can Read:** Members of the kitchen's parent organization (`public.is_org_member(organization_id)`) and System Admins (`public.is_admin()`).
  - **Who can Insert:** Kitchen users belonging to the parent organization (`role = 'kitchen' and is_org_member(organization_id)`) and Admins.
  - **Who can Update:** Kitchen users belonging to the parent organization and Admins.
  - **Who Cannot Access:** Users from other organizations, receiver users, unassigned users (`organization_id = NULL`), and unauthenticated clients.

#### 2. `public.meals`
- **Purpose:** Represents a planned or scheduled meal service event for a specific kitchen, date, and meal period.
- **Relevant Fields:**
  - `id` (`uuid`, PK, default `gen_random_uuid()`)
  - `kitchen_id` (`uuid`, not null, FK references `kitchens(id)` on delete cascade)
  - `meal_name` (`text`, not null)
  - `meal_date` (`date`, not null)
  - `meal_period` (`public.meal_period`, not null: `'breakfast'`, `'lunch'`, `'dinner'`, `'snack'`, `'other'`)
  - `expected_consumers` (`integer`, not null, check `expected_consumers >= 0`)
  - `planned_quantity` (`numeric(12,2)`, not null, check `planned_quantity >= 0`)
  - `unit` (`text`, not null, default `'servings'`)
  - `created_at` (`timestamptz`, not null, default `now()`)
- **Relationships:**
  - Belongs to `kitchens` (N:1 via `kitchen_id`)
  - Has one or zero `consumption_records` (1:1 / 1:N via `meal_id`)
  - Has zero or many `surplus_items` (1:N via `source_meal_id`)
- **RLS Access Authority:**
  - **Who can Read:** Organization members who own the kitchen via helper `public.can_access_kitchen(kitchen_id)` and Admins.
  - **Who can Insert:** Kitchen users authorized for that kitchen (`role = 'kitchen' and can_access_kitchen(kitchen_id)`) and Admins.
  - **Who can Update:** Kitchen users authorized for that kitchen and Admins.
  - **Who Cannot Access:** Users from different organizations, receiver users, unassigned users, and unauthenticated clients.

#### 3. `public.consumption_records`
- **Purpose:** Post-service ground truth capturing actual headcounts, prepared amounts, consumed portions, and leftover quantities.
- **Relevant Fields:**
  - `id` (`uuid`, PK, default `gen_random_uuid()`)
  - `meal_id` (`uuid`, not null, FK references `meals(id)` on delete cascade)
  - `actual_consumers` (`integer`, not null, check `actual_consumers >= 0`)
  - `prepared_quantity` (`numeric(12,2)`, not null, check `prepared_quantity >= 0`)
  - `consumed_quantity` (`numeric(12,2)`, not null, check `consumed_quantity >= 0`)
  - `leftover_quantity` (`numeric(12,2)`, not null, check `leftover_quantity >= 0`)
  - `recorded_at` (`timestamptz`, not null, default `now()`)
- **Relationships:**
  - Belongs to `meals` (N:1 via `meal_id`)
- **RLS Access Authority:**
  - **Who can Read:** Kitchen organization members owning the meal's kitchen (`exists (select 1 from meals m where m.id = meal_id and can_access_kitchen(m.kitchen_id))`) and Admins.
  - **Who can Insert:** Kitchen users authorized for the kitchen (`role = 'kitchen' and can_access_kitchen(m.kitchen_id)`).
  - **Who can Update:** Kitchen users authorized for the kitchen.
  - **Who Cannot Access:** Users from other organizations, receiver users, unassigned users, and unauthenticated clients.

#### 4. `public.demand_predictions`
- **Purpose:** Stores point-in-time forecast snapshots generated by the baseline demand prediction engine for a kitchen, date, and meal period.
- **Relevant Fields:**
  - `id` (`uuid`, PK, default `gen_random_uuid()`)
  - `kitchen_id` (`uuid`, not null, FK references `kitchens(id)` on delete cascade)
  - `prediction_date` (`date`, not null)
  - `meal_period` (`public.meal_period`, not null)
  - `predicted_consumers` (`integer`, not null, check `predicted_consumers >= 0`)
  - `recommended_quantity` (`numeric(12,2)`, not null, check `recommended_quantity >= 0`)
  - `predicted_surplus` (`numeric(12,2)`, not null, default 0, check `predicted_surplus >= 0`)
  - `confidence` (`numeric(5,4)`, nullable, check `confidence >= 0 and confidence <= 1`)
  - `model_version` (`text`, not null, default `'mvp-baseline-v1'`)
  - `created_at` (`timestamptz`, not null, default `now()`)
- **Relationships:**
  - Belongs to `kitchens` (N:1 via `kitchen_id`)
- **RLS Access Authority:**
  - **Who can Read:** Kitchen organization members (`can_access_kitchen(kitchen_id)`) and Admins.
  - **Who can Insert:** Kitchen users authorized for that kitchen and Admins.
  - **Who can Update:** None (predictions are immutable historical audit snapshots).
  - **Who Cannot Access:** Receivers, other kitchen organizations, unassigned users, and unauthenticated callers.

#### 5. `public.surplus_items` (Handoff Target)
- **Purpose:** Holds declared surplus food batches ready for AI classification, recovery routing, and receiver matching.
- **Relevant Fields for Kitchen Module:**
  - `id` (`uuid`, PK, default `gen_random_uuid()`)
  - `kitchen_id` (`uuid`, not null, FK references `kitchens(id)` on delete cascade)
  - `source_meal_id` (`uuid`, nullable, FK references `meals(id)` on delete set null)
  - `food_name` (`text`, not null)
  - `quantity` (`numeric(12,2)`, not null, check `quantity > 0`)
  - `unit` (`text`, not null, default `'kg'`)
  - `prepared_at` (`timestamptz`, nullable)
  - `reported_at` (`timestamptz`, not null, default `now()`)
  - `redistribution_deadline` (`timestamptz`, nullable)
  - `status` (`public.surplus_status`, not null, default `'active'`)
  - `category` (`public.surplus_category`, not null, default `'unknown'`)
  - `ai_confidence` (`numeric(5,4)`, nullable)
  - `image_path` (`text`, nullable)
  - `notes` (`text`, nullable)
  - `created_at` (`timestamptz`, not null, default `now()`)
- **Relationships:**
  - Belongs to `kitchens` (N:1 via `kitchen_id`)
  - Belongs optionally to `meals` (N:1 via `source_meal_id`)
- **RLS Access Authority:**
  - **Who can Read:** Organization members owning the kitchen, Admins, and verified Receivers matched to the surplus item (`public.can_access_surplus(id)`).
  - **Who can Insert:** Kitchen users authorized for that kitchen (`role = 'kitchen' and can_access_kitchen(kitchen_id)`).
  - **Who can Update:** Kitchen users authorized for that kitchen and Admins.
  - **Who Cannot Access:** Unmatched receivers, unrelated kitchen orgs, unassigned users, and unauthenticated clients.

### 2.2 Summary Access Control Matrix

| Table | Admin (`admin`) | Own Org Kitchen (`kitchen`) | Other Org Kitchen | Receiver User (`receiver`) | Unassigned / Anonymous |
|---|---|---|---|---|---|
| `kitchens` | `ALL` | `SELECT`, `UPDATE` | ❌ Denied | ❌ Denied | ❌ Denied |
| `meals` | `ALL` | `SELECT`, `INSERT`, `UPDATE` | ❌ Denied | ❌ Denied | ❌ Denied |
| `consumption_records` | `ALL` | `SELECT`, `INSERT`, `UPDATE` | ❌ Denied | ❌ Denied | ❌ Denied |
| `demand_predictions` | `ALL` | `SELECT`, `INSERT` | ❌ Denied | ❌ Denied | ❌ Denied |
| `surplus_items` | `ALL` | `SELECT`, `INSERT`, `UPDATE` | ❌ Denied | `SELECT` (Matched only) | ❌ Denied |

---

## 3. Meal Workflow

The Meal Workflow enables kitchen managers to plan upcoming services, review schedules, and edit configurations before execution.

```text
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Plan Meal     │ ────► │   Review & Edit │ ────► │  Execute Service│
│ (POST /meals)   │       │ (PATCH /meals)  │       │(Log Consumption)│
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### 3.1 Operations & Life-Cycle

1. **Create Meal (`POST /api/meals`):**
   - Schedules a new meal period.
   - Triggers or queries baseline demand forecast to guide the `planned_quantity`.
2. **Edit Meal (`PATCH /api/meals/:id`):**
   - Allows modifying `mealName`, `mealDate`, `mealPeriod`, `expectedConsumers`, `plannedQuantity`, and `unit`.
   - **Validation Constraint:** Editing is permitted only if no `consumption_records` row is attached to the meal.
3. **View Meal (`GET /api/meals/:id` & `GET /api/meals`):**
   - Fetches meal details, attached consumption records, linked prediction estimates, and surplus handoff status.
4. **Date Filtering:**
   - Query by `startDate` and `endDate` (ISO format `YYYY-MM-DD`). Default: current week (`[today - 1 day, today + 6 days]`).
5. **Meal-Period Filtering:**
   - Filter query results by `mealPeriod` (`breakfast`, `lunch`, `dinner`, `snack`, `other`).

### 3.2 Expected Inputs & Validation Rules

| Input Property | Type & Format | Validation Constraint (Schema & Application) | Default Value |
|---|---|---|---|
| `kitchenId` | UUID string | Must be a valid UUID; user must own the kitchen | Session default |
| `mealName` | string | Length $\in [2, 100]$ characters; trimmed | Required |
| `mealDate` | string (`YYYY-MM-DD`) | Valid calendar date; cannot be older than 365 days | Required |
| `mealPeriod` | Enum string | Must be one of: `breakfast`, `lunch`, `dinner`, `snack`, `other` | Required |
| `expectedConsumers` | integer | Must be an integer $\ge 0$ | Required |
| `plannedQuantity` | number (decimal) | Must be $> 0$ (precision: up to 2 decimal places) | Required |
| `unit` | string | Length $\in [1, 30]$ characters (e.g., `'servings'`, `'kg'`, `'litres'`, `'trays'`) | `'servings'` |

---

## 4. Consumption Workflow & Validation Constraints

The post-service consumption record captures actual ground truth once dining concludes.

### 4.1 Input Parameters

- `mealId` (`uuid`): ID of the corresponding planned meal.
- `actualConsumers` (`integer`): Verified headcount of individuals served.
- `preparedQuantity` (`numeric`): Final actual quantity of food prepared.
- `consumedQuantity` (`numeric`): Quantity of food eaten by consumers.
- `leftoverQuantity` (`numeric`): Quantity of unconsumed food remaining.

### 4.2 Schema & Deterministic Application Validation

To ensure mathematical consistency and prevent data corruption, all consumption records must pass both database constraints and strict application-level mass-conservation guards:

```text
Database Check Constraints:
  ├── actual_consumers >= 0
  ├── prepared_quantity >= 0
  ├── consumed_quantity >= 0
  └── leftover_quantity >= 0

Application Deterministic Mass-Conservation Rules:
  ├── Rule 1: consumed_quantity <= prepared_quantity
  │   └── Reason: Cannot consume more food than was prepared.
  │
  ├── Rule 2: leftover_quantity <= prepared_quantity
  │   └── Reason: Leftovers cannot exceed total prepared food.
  │
  ├── Rule 3: consumed_quantity + leftover_quantity <= prepared_quantity * 1.05
  │   └── Reason: Total accounted mass cannot exceed prepared mass (5% measurement tolerance).
  │
  ├── Rule 4: If actual_consumers == 0:
  │   └── consumed_quantity MUST == 0, and leftover_quantity SHOULD == prepared_quantity.
  │
  └── Rule 5: One record per meal (Uniqueness constraint on meal_id).
```

*If any rule is violated, the API rejects the request with `400 VALIDATION_ERROR` or `422 UNPROCESSABLE_ENTITY` containing exact error details.*

---

## 5. Deterministic Demand Prediction Engine

The platform implements the **`mvp-baseline-v1`** deterministic multi-window moving average algorithm.

### 5.1 Three Historical Query Windows (Exact Unambiguous Queries)

For a target kitchen `kitchen_id`, target service date $T$ (`prediction_date`), and target meal shift `meal_period`:

> [!IMPORTANT]
> **Strict Meal-Period Isolation:** Forecasts for `lunch` query ONLY historical `lunch` records. Breakfast, dinner, and snack records are strictly excluded from lunch calculations.

#### Window A: Same-Weekday Historical Average ($\bar{C}_{\text{weekday}}$, Weight $w_1 = 0.50$)
- **Query Date Window:** $[T - 28\text{ days}, T - 1\text{ day}]$
- **Criteria:**
  - `meals.kitchen_id = :kitchenId`
  - `meals.meal_period = :mealPeriod`
  - `extract(dow from meals.meal_date) = extract(dow from :predictionDate)`
  - `consumption_records.actual_consumers > 0`
- **Aggregation:** Arithmetic mean of `consumption_records.actual_consumers` across the matching same-weekday records ($N_{\text{weekday}} \le 4$).

#### Window B: Recent 7-Day Historical Average ($\bar{C}_{\text{7day}}$, Weight $w_2 = 0.30$)
- **Query Date Window:** $[T - 7\text{ days}, T - 1\text{ day}]$
- **Criteria:**
  - `meals.kitchen_id = :kitchenId`
  - `meals.meal_period = :mealPeriod`
  - `consumption_records.actual_consumers > 0`
- **Aggregation:** Arithmetic mean of `consumption_records.actual_consumers` across matching records in the prior 7 calendar days ($N_{\text{7day}} \le 7$).

#### Window C: Same-Meal-Period Historical Average ($\bar{C}_{\text{period}}$, Weight $w_3 = 0.20$)
- **Query Date Window:** $[T - 28\text{ days}, T - 1\text{ day}]$
- **Criteria:**
  - `meals.kitchen_id = :kitchenId`
  - `meals.meal_period = :mealPeriod`
  - `consumption_records.actual_consumers > 0`
- **Aggregation:** Arithmetic mean of `consumption_records.actual_consumers` across all matching records over the full 28-day lookback period ($N_{\text{period}} \le 28$).

### 5.2 Dynamic Weight Normalization for Incomplete History

$$\hat{D}_{\text{consumers}} = \sum_{i \in A} w_i' \cdot \bar{C}_i$$

Where $A \subseteq \{ \text{weekday}, \text{7day}, \text{period} \}$ is the set of components with at least 1 valid sample, and:
$$w_i' = \frac{w_i}{\sum_{k \in A} w_k}$$

- **Case 1 (Full History):** $w_{\text{weekday}}' = 0.50$, $w_{\text{7day}}' = 0.30$, $w_{\text{period}}' = 0.20$.
- **Case 2 (No Weekday Samples):** $w_{\text{7day}}' = \frac{0.30}{0.50} = 0.60$, $w_{\text{period}}' = \frac{0.20}{0.50} = 0.40$.
- **Case 3 (Only Period Samples):** $w_{\text{period}}' = 1.00$.

### 5.3 Portion Ratio Aggregation & Cold-Start Rules

#### 5.3.1 Historical Portion Ratio Aggregation
For each historical consumption record $j \in H$ belonging to the same kitchen, same `meal_period`, and same unit where `actual_consumers > 0`:
$$R_j = \frac{\text{prepared\_quantity}_j}{\text{actual\_consumers}_j}$$

The historical average portion ratio $\bar{R}$ is the **arithmetic mean** of per-record ratios:
$$\bar{R} = \frac{1}{M} \sum_{j=1}^M R_j$$

*Records with `actual_consumers = 0`, nulls, negative quantities, or invalid mass-balance violations are strictly excluded from ratio computation.*

#### 5.3.2 Cold-Start & Missing Portion-Ratio Fallback
If no valid historical portion-ratio samples exist ($M = 0$):
1. **Manual Baseline Ratio:** If `baselinePortionRatio` is supplied in the prediction request, use $\bar{R} = \text{baselinePortionRatio}$.
2. **Deterministic Unit Defaults:** If `baselinePortionRatio` is not provided, apply the following deterministic unit defaults:
   - `'servings'`: $\bar{R} = 1.00\text{ serving/consumer}$
   - `'kg'`: $\bar{R} = 0.40\text{ kg/consumer}$ (Standard institutional meal weight: 400g)
   - `'litres'` / `'l'`: $\bar{R} = 0.35\text{ litres/consumer}$ (Standard institutional soup/beverage portion: 350ml)
   - **Other Units (e.g. `'trays'`, `'boxes'`, `'custom'`):** The API **requires** a manually supplied `baselinePortionRatio > 0`. If omitted for an unrecognized unit, the request is rejected with `400 VALIDATION_ERROR`.
3. **Unit Consistency:** The resulting `recommended_quantity` remains strictly in the target meal's planned `unit`.

### 5.4 Quantity Recommendation & Modeled Surplus Formula

#### 1. Recommended Preparation Quantity ($\hat{Q}_{\text{rec}}$)
$$\hat{Q}_{\text{rec}} = \text{round}\left( \hat{D}_{\text{consumers}} \times \bar{R} \times 1.03, \; 2 \right)$$
- Includes a **3% preparation safety buffer** ($\beta = 1.03$) to absorb unexpected attendance spikes.
- Rounding: Standard decimal half-up to 2 decimal places.

#### 2. Predicted (Modeled) Surplus ($\hat{S}$)
$$\hat{S} = \max\left( 0, \; \text{round}\left( \hat{Q}_{\text{rec}} - (\hat{D}_{\text{consumers}} \times \bar{R}), \; 2 \right) \right)$$
> [!NOTE]
> **Modeled Buffer vs Observed Actual Surplus:** $\hat{S}$ represents the mathematical safety buffer intentionally built into the preparation plan. It is **NOT** observed surplus. Observed actual surplus is captured post-service in `consumption_records.leftover_quantity`.

### 5.5 Cold-Start Complete Behavior (Zero History)

When there are **zero** valid historical consumer records in the 28-day window:
1. $\hat{D}_{\text{consumers}} = \text{request.expectedConsumers}$ (if provided $\ge 0$), otherwise default $100$.
2. $\text{confidence} = 0.20$ (Minimum confidence floor).
3. $\bar{R} = \text{request.baselinePortionRatio}$ or deterministic unit default.
4. The system flags the forecast with status: `"COLD_START_MANUAL_BASELINE"`.

### 5.6 Confidence Calculation Metric

The confidence score $S_{\text{conf}} \in [0.20, 0.95]$ quantifies historical sample depth:

$$S_{\text{conf}} = 0.20 + 0.30 \cdot \min\left(1, \frac{N_{\text{weekday}}}{4}\right) + 0.25 \cdot \min\left(1, \frac{N_{\text{7day}}}{7}\right) + 0.20 \cdot \min\left(1, \frac{N_{\text{period}}}{20}\right)$$

---

## 6. Worked Example (Deterministic Arithmetic)

### Scenario Setup
- **Kitchen:** `Green Valley Main Kitchen`
- **Target Service:** Wednesday Lunch (`2026-10-14`, `lunch`, unit: `'servings'`)
- **Historical Consumption Data (Lookback: `2026-09-16` to `2026-10-13`):**
  - Past 4 Wednesdays (`lunch`): `[820, 800, 840, 810]` $\rightarrow \bar{C}_{\text{weekday}} = 817.50$ ($N_{\text{weekday}} = 4$).
  - Past 7 Days (`lunch`): `[790, 810, 805, 830, 800, 820, 815]` $\rightarrow \bar{C}_{\text{7day}} = 810.00$ ($N_{\text{7day}} = 7$).
  - Full 28-day window (`lunch`): 28 recorded meals $\rightarrow \bar{C}_{\text{period}} = 808.00$ ($N_{\text{period}} = 28$).
  - Per-record portion ratios: 28 historical samples with arithmetic mean $\bar{R} = 1.05\text{ servings/person}$.

### Step-by-Step Calculation

1. **Predicted Consumers ($\hat{D}_{\text{consumers}}$):**
   $$\hat{D}_{\text{consumers}} = (0.50 \times 817.50) + (0.30 \times 810.00) + (0.20 \times 808.00)$$
   $$\hat{D}_{\text{consumers}} = 408.75 + 243.00 + 161.60 = 813.35 \approx \mathbf{813\text{ consumers}}$$

2. **Recommended Preparation Quantity ($\hat{Q}_{\text{rec}}$ with $\beta = 1.03$):**
   $$\hat{Q}_{\text{rec}} = \text{round}(813.35 \times 1.05 \times 1.03, \; 2) = \text{round}(879.638, \; 2) = \mathbf{879.64\text{ servings}} \approx \mathbf{880\text{ servings}}$$

3. **Predicted Modeled Surplus ($\hat{S}$):**
   $$\hat{S} = \text{round}(879.64 - (813.35 \times 1.05), \; 2) = \text{round}(879.64 - 854.0175, \; 2) = \mathbf{25.62\text{ servings}}$$

4. **Confidence Score ($S_{\text{conf}}$):**
   $$S_{\text{conf}} = 0.20 + 0.30\left(\frac{4}{4}\right) + 0.25\left(\frac{7}{7}\right) + 0.20\left(\frac{20}{20}\right) = 0.20 + 0.30 + 0.25 + 0.20 = \mathbf{0.95}\; (95\%)$$

### Reproducible TypeScript Implementation

```typescript
export interface HistoricalRecord {
  mealDate: string;
  actualConsumers: number;
  preparedQuantity: number;
  unit: string;
}

export interface PredictionInput {
  targetDate: string;
  targetUnit: string;
  expectedConsumers?: number;
  baselinePortionRatio?: number;
  historicalRecords: HistoricalRecord[];
}

export interface DemandPredictionResult {
  predictedConsumers: number;
  portionRatio: number;
  recommendedQuantity: number;
  predictedSurplus: number;
  confidence: number;
  confidenceTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'COLD_START';
  breakdown: {
    weekdayAverage: number | null;
    sevenDayAverage: number | null;
    periodAverage: number | null;
    weekdaySampleCount: number;
    sevenDaySampleCount: number;
    periodSampleCount: number;
  };
  modelVersion: string;
}

export function computeDemandPrediction(input: PredictionInput): DemandPredictionResult {
  const targetTime = new Date(input.targetDate).getTime();
  const targetDayOfWeek = new Date(input.targetDate).getUTCDay();

  const validRecords = input.historicalRecords.filter(r => {
    const recordTime = new Date(r.mealDate).getTime();
    const daysDiff = (targetTime - recordTime) / (1000 * 60 * 60 * 24);
    return daysDiff >= 1 && daysDiff <= 28 && r.actualConsumers > 0 && r.preparedQuantity >= 0;
  });

  const weekdayRecords = validRecords.filter(r => new Date(r.mealDate).getUTCDay() === targetDayOfWeek);
  const sevenDayRecords = validRecords.filter(r => {
    const daysDiff = (targetTime - new Date(r.mealDate).getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff >= 1 && daysDiff <= 7;
  });

  const nWeekday = weekdayRecords.length;
  const n7Day = sevenDayRecords.length;
  const nPeriod = validRecords.length;

  const avgWeekday = nWeekday > 0 ? weekdayRecords.reduce((acc, r) => acc + r.actualConsumers, 0) / nWeekday : null;
  const avg7Day = n7Day > 0 ? sevenDayRecords.reduce((acc, r) => acc + r.actualConsumers, 0) / n7Day : null;
  const avgPeriod = nPeriod > 0 ? validRecords.reduce((acc, r) => acc + r.actualConsumers, 0) / nPeriod : null;

  let totalWeight = 0;
  if (avgWeekday !== null) totalWeight += 0.50;
  if (avg7Day !== null) totalWeight += 0.30;
  if (avgPeriod !== null) totalWeight += 0.20;

  let predictedConsumers = input.expectedConsumers ?? 100;
  let confidence = 0.20;

  if (totalWeight > 0) {
    let weightedSum = 0;
    if (avgWeekday !== null) weightedSum += (0.50 / totalWeight) * avgWeekday;
    if (avg7Day !== null) weightedSum += (0.30 / totalWeight) * avg7Day;
    if (avgPeriod !== null) weightedSum += (0.20 / totalWeight) * avgPeriod;

    predictedConsumers = Math.round(weightedSum);

    confidence = Number((
      0.20 +
      0.30 * Math.min(1, nWeekday / 4) +
      0.25 * Math.min(1, n7Day / 7) +
      0.20 * Math.min(1, nPeriod / 20)
    ).toFixed(4));
  }

  // Portion Ratio resolution
  let portionRatio: number;
  const sameUnitRecords = validRecords.filter(r => r.unit.toLowerCase() === input.targetUnit.toLowerCase());
  
  if (sameUnitRecords.length > 0) {
    const perRecordRatios = sameUnitRecords.map(r => r.preparedQuantity / r.actualConsumers);
    portionRatio = perRecordRatios.reduce((a, b) => a + b, 0) / perRecordRatios.length;
  } else if (input.baselinePortionRatio && input.baselinePortionRatio > 0) {
    portionRatio = input.baselinePortionRatio;
  } else {
    // Deterministic Unit Defaults
    switch (input.targetUnit.toLowerCase()) {
      case 'servings': portionRatio = 1.0; break;
      case 'kg': portionRatio = 0.40; break;
      case 'litres':
      case 'l': portionRatio = 0.35; break;
      default: portionRatio = 1.0; break;
    }
  }

  portionRatio = Math.round(portionRatio * 1000) / 1000;

  const exactRecommended = predictedConsumers * portionRatio * 1.03;
  const recommendedQuantity = Math.round(exactRecommended * 100) / 100;
  const exactExpectedDemand = predictedConsumers * portionRatio;
  const predictedSurplus = Math.max(0, Math.round((recommendedQuantity - exactExpectedDemand) * 100) / 100);

  let confidenceTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'COLD_START' = 'COLD_START';
  if (totalWeight === 0) confidenceTier = 'COLD_START';
  else if (confidence >= 0.80) confidenceTier = 'HIGH';
  else if (confidence >= 0.50) confidenceTier = 'MEDIUM';
  else confidenceTier = 'LOW';

  return {
    predictedConsumers,
    portionRatio,
    recommendedQuantity,
    predictedSurplus,
    confidence,
    confidenceTier,
    breakdown: {
      weekdayAverage: avgWeekday !== null ? Math.round(avgWeekday * 10) / 10 : null,
      sevenDayAverage: avg7Day !== null ? Math.round(avg7Day * 10) / 10 : null,
      periodAverage: avgPeriod !== null ? Math.round(avgPeriod * 10) / 10 : null,
      weekdaySampleCount: nWeekday,
      sevenDaySampleCount: n7Day,
      periodSampleCount: nPeriod,
    },
    modelVersion: 'mvp-baseline-v1',
  };
}
```

---

## 7. REST API Design & Specifications

All endpoints use standard JSON envelopes:
- Success: `{ "data": T, "error": null }`
- Error: `{ "data": null, "error": { "code": string, "message": string, "details": any } }`

### 7.1 Meals API

#### `POST /api/meals`
- **Method:** `POST`
- **Purpose:** Create and schedule an upcoming meal service.
- **Auth & Role:** Authenticated session; Role $\in \{ \text{'kitchen'}, \text{'admin'} \}$.
- **Request Zod Schema:**
  ```typescript
  z.object({
    kitchenId: z.string().uuid(),
    mealName: z.string().min(2).max(100),
    mealDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    mealPeriod: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']),
    expectedConsumers: z.number().int().nonnegative(),
    plannedQuantity: z.number().positive(),
    unit: z.string().min(1).max(30).default('servings')
  })
  ```
- **Responses:**
  - `201 Created`: Returns newly created meal object.
  - `400 VALIDATION_ERROR`: Invalid inputs or schema failure.
  - `401 UNAUTHORIZED`: Missing/expired session.
  - `403 FORBIDDEN`: Caller lacks kitchen permissions for `kitchenId`.

#### `GET /api/meals`
- **Method:** `GET`
- **Purpose:** Query meals for user's kitchen with date and meal period filters.
- **Query Params:**
  - `kitchenId` (`uuid`, optional)
  - `startDate` (`YYYY-MM-DD`, optional)
  - `endDate` (`YYYY-MM-DD`, optional)
  - `mealPeriod` (`breakfast` | `lunch` | `dinner` | `snack` | `other`, optional)
  - `limit` (integer, default 50)
  - `offset` (integer, default 0)

#### `GET /api/meals/:id`
- **Method:** `GET`
- **Purpose:** Fetch single meal details including consumption status and linked surplus items.

#### `PATCH /api/meals/:id`
- **Method:** `PATCH`
- **Purpose:** Update a planned meal before consumption recording.
- **Request Zod Schema:**
  ```typescript
  z.object({
    mealName: z.string().min(2).max(100).optional(),
    mealDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    mealPeriod: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']).optional(),
    expectedConsumers: z.number().int().nonnegative().optional(),
    plannedQuantity: z.number().positive().optional(),
    unit: z.string().min(1).max(30).optional()
  })
  ```
- **Error Guard:** Rejects with `422 UNPROCESSABLE_ENTITY` if `consumption_records` already exists.

---

### 7.2 Consumption API

#### `POST /api/consumption`
- **Method:** `POST`
- **Purpose:** Record post-service actuals, consumed quantities, and leftovers.
- **Auth & Role:** Authenticated session; Role $\in \{ \text{'kitchen'}, \text{'admin'} \}$.
- **Request Zod Schema:**
  ```typescript
  z.object({
    mealId: z.string().uuid(),
    actualConsumers: z.number().int().nonnegative(),
    preparedQuantity: z.number().nonnegative(),
    consumedQuantity: z.number().nonnegative(),
    leftoverQuantity: z.number().nonnegative()
  }).refine((data) => data.consumedQuantity <= data.preparedQuantity, {
    message: "Consumed quantity cannot exceed prepared quantity",
    path: ["consumedQuantity"]
  }).refine((data) => data.leftoverQuantity <= data.preparedQuantity, {
    message: "Leftover quantity cannot exceed prepared quantity",
    path: ["leftoverQuantity"]
  }).refine((data) => (data.consumedQuantity + data.leftoverQuantity) <= (data.preparedQuantity * 1.05), {
    message: "Sum of consumed and leftover exceeds prepared quantity by more than 5% tolerance",
    path: ["leftoverQuantity"]
  })
  ```

---

### 7.3 Demand Predictions API

#### `POST /api/predictions/demand`
- **Method:** `POST`
- **Purpose:** Compute and persist a deterministic demand prediction for a meal schedule.
- **Request Zod Schema:**
  ```typescript
  z.object({
    kitchenId: z.string().uuid(),
    predictionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mealPeriod: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']),
    expectedConsumers: z.number().int().nonnegative().optional(),
    unit: z.string().min(1).default('servings'),
    baselinePortionRatio: z.number().positive().optional()
  })
  ```
- **Response (200 OK / 201 Created):**
  ```json
  {
    "data": {
      "id": "uuid",
      "kitchenId": "20000000-0000-0000-0000-000000000001",
      "predictionDate": "2026-10-14",
      "mealPeriod": "lunch",
      "predictedConsumers": 813,
      "portionRatio": 1.05,
      "recommendedQuantity": 879.64,
      "predictedSurplus": 25.62,
      "confidence": 0.95,
      "confidenceTier": "HIGH",
      "breakdown": {
        "weekdayAverage": 817.5,
        "sevenDayAverage": 810.0,
        "periodAverage": 808.0,
        "weekdaySampleCount": 4,
        "sevenDaySampleCount": 7,
        "periodSampleCount": 28
      },
      "modelVersion": "mvp-baseline-v1",
      "createdAt": "2026-10-08T08:30:00Z"
    },
    "error": null
  }
  ```

---

## 8. UI Disclosure & Transparent Calculation Hierarchy

The Kitchen UI gives managers 100% transparent insight into the predictive arithmetic:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           KITCHEN INTELLIGENCE PORTAL                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. What meal am I planning?                                                    │
│     [ Wednesday Lunch Service | Oct 14, 2026 | Lunch Shift ]                    │
│                                                                                 │
│  2. How many people are expected?                                               │
│     [ Predicted Headcount: 813 People ] ── [ HIGH CONFIDENCE: 95% ★★★★ ]        │
│                                                                                 │
│     Transparent Historical Breakdown:                                           │
│     • Same-Weekday Avg (4 Wednesdays): 817.5 consumers  (50% Weight)           │
│     • Recent 7-Day Avg (7 Days):       810.0 consumers  (30% Weight)           │
│     • 28-Day Shift Avg (28 Meals):     808.0 consumers  (20% Weight)           │
│                                                                                 │
│  3. How much should I prepare?                                                  │
│     • Avg Historical Portion Ratio: 1.05 servings/consumer                      │
│     • Planned Baseline Demand:      854.02 servings                             │
│     • Safety Buffer (+3%):          +25.62 servings                             │
│     ➔ RECOMMENDED PREPARATION:      880.00 SERVINGS                             │
│                                                                                 │
│  4. Post-Service Audit (Once Service Finishes):                                 │
│     [ Headcount: 790 Served | Consumed: 835 Servings | Leftover: 45 Servings ]  │
│                                                                                 │
│  5. Observed Surplus Action:                                                    │
│     [ 45 Servings Actual Leftovers ➔ [ Declare Surplus for Redistribution → ] ] │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Confidence Tiers & Visual Indicators
- **High Confidence ($S_{\text{conf}} \ge 0.80$):** Green badge ("High Confidence — Robust 28-day history").
- **Medium Confidence ($0.50 \le S_{\text{conf}} < 0.80$):** Blue/Amber badge ("Medium Confidence — Limited recent samples").
- **Low Confidence ($0.25 \le S_{\text{conf}} < 0.50$):** Orange badge ("Low Confidence — Sparse history").
- **Cold Start / Manual Baseline ($S_{\text{conf}} \le 0.20$):** Purple badge ("Cold Start / Manual Baseline — No prior consumption records").

---

## 9. Surplus Handoff Integration Boundary

When post-service auditing records leftover food (`leftover_quantity > 0`), the Kitchen Intelligence module hands off the data to the Surplus Management module:

```text
┌──────────────────────────────────────────────┐
│  public.consumption_records                  │
│  • meal_id: UUID                             │
│  • leftover_quantity: 45.0                   │
└──────────────────────┬───────────────────────┘
                       │
                       ▼ User clicks "Declare Surplus"
┌──────────────────────────────────────────────┐
│  public.surplus_items                        │
│  • id: gen_random_uuid()                     │
│  • kitchen_id: meals.kitchen_id              │
│  • source_meal_id: meals.id                  │
│  • food_name: meals.meal_name                │
│  • quantity: leftover_quantity               │
│  • unit: meals.unit                          │
│  • status: 'active'                          │
│  • category: 'unknown' (Pending AI Scan)     │
│  • reported_at: now()                        │
└──────────────────────┬───────────────────────┘
                       │
                       ▼ Handed off to Phase 3
┌──────────────────────────────────────────────┐
│  Redistribution & Recovery Pipeline          │
│  (AI Photo Scan ➔ Matching ➔ Pickup)         │
└──────────────────────────────────────────────┘
```

The Kitchen Intelligence module maintains strict decoupling: it provides the source data and trigger, while the downstream Surplus Module handles image upload, category classification, receiver scoring, and pickup logistics.

---

## 10. Comprehensive Test Specification (11 Test Cases)

The prediction and validation engine must satisfy the following 11 automated test specifications in Vitest (`tests/unit/prediction.test.ts` & `tests/unit/consumption-validation.test.ts`):

1. **Normal History:** 4 same-weekday samples, 7 recent-day samples, 28 period samples $\rightarrow$ verifies exact $50/30/20$ weighted arithmetic, confidence score $\ge 0.90$.
2. **No Weekday Samples ($N_{\text{weekday}} = 0$):** Verifies dynamic weight re-allocation ($w_{\text{7day}}' = 0.60, w_{\text{period}}' = 0.40$) without NaN errors.
3. **No 7-Day Samples ($N_{\text{7day}} = 0$):** Verifies dynamic weight re-allocation ($w_{\text{weekday}}' = \frac{0.5}{0.7} \approx 0.714, w_{\text{period}}' = \frac{0.2}{0.7} \approx 0.286$).
4. **No Meal-Period Samples ($N_{\text{period}} = 0$):** Same as complete cold start.
5. **No Historical Records At All (Cold Start):** Verifies fallback to `expectedConsumers` (or 100), $S_{\text{conf}} = 0.20$, tier `'COLD_START'`.
6. **No Portion-Ratio History:** Verifies correct deterministic unit default fallback (`'servings' \rightarrow 1.0`, `'kg' \rightarrow 0.40`, `'litres' \rightarrow 0.35`) or use of `baselinePortionRatio`.
7. **Exclusion of `actual_consumers = 0` Records:** Verifies that records with zero consumers are strictly excluded from moving averages and portion ratio calculations.
8. **Mixed Measurement Units Handling:** Verifies that portion ratios only aggregate historical records matching the target unit.
9. **Negative Quantities Rejection:** Verifies that negative consumers or quantities are rejected by Zod validation schemas.
10. **Rounding Verification:** Verifies half-up rounding to exactly 2 decimal places for recommended quantities and predicted buffer surplus.
11. **Confidence Bounds Enforcement:** Verifies that confidence is mathematically bounded strictly within $[0.20, 0.95]$.

---

*Phase 2A finalized specification locked for Phase 2B implementation.*
