# AI Food Waste Intelligence & Redistribution Platform

## 1. Purpose

A web-based MVP for institutional kitchens and food-processing units that reduces food waste by:

1. Predicting expected food demand.
2. Detecting and classifying surplus/waste.
3. Determining the best recovery pathway.
4. Matching edible surplus with nearby eligible receivers.
5. Tracking pickup, recovery, and impact.
6. Learning from historical records to improve future recommendations.

This file is the single source of truth for the MVP architecture.

---

## 2. MVP Product Flow

```text
Kitchen records planned meal
        ↓
Demand estimation
        ↓
Food prepared / consumption recorded
        ↓
Surplus reported + optional image uploaded
        ↓
AI classification
        ↓
Rule + decision engine
        ↓
┌──────────────────────────────────────────────┐
│ Edible → Redistribute                        │
│ Reusable → Secondary use / processing        │
│ Organic → Compost / recovery                 │
│ Unsafe → Responsible disposal                │
└──────────────────────────────────────────────┘
        ↓
Receiver matching
        ↓
Pickup request
        ↓
Pickup completed
        ↓
Impact recorded
        ↓
Analytics + future prediction
```

---

## 3. Technology Stack

### Development
- Primary IDE: Google Antigravity
- Secondary IDE: VS Code
- Version control: Git + GitHub

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React
- Recharts
- MapLibre GL JS

### Backend
- Next.js Route Handlers
- Server Actions where appropriate
- Zod validation

### Platform / Data
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime
- Supabase Edge Functions only when a server-side isolated function is useful
- Storage buckets: `food-images` and `pickup-proofs` (private, RLS-protected)

### AI
- Gemini API
- Structured JSON output for AI responses

### Deployment
- Vercel: application
- Supabase Cloud: database, auth, storage, realtime

### Testing
- Vitest: unit / decision-engine tests
- Playwright: end-to-end tests

---

## 4. Core User Roles

### Kitchen Manager
- Manage kitchen profile
- Record meals and expected consumers
- Record prepared/consumed quantities
- Report surplus/waste
- Upload optional food image
- View predictions
- View active surplus
- Create/approve pickup requests
- View kitchen analytics

### Receiver
- Maintain receiver profile and capacity
- View eligible surplus nearby
- Accept a matched surplus item
- Confirm pickup
- View pickup history

### Admin
- View system-wide metrics
- Manage users/organizations
- Review records
- View top waste sources and recovery performance
- Manage configurable rules where permitted

---

## 5. Main Modules

```text
1. Authentication & Role Management
2. Kitchen Management
3. Meal & Consumption Tracking
4. Demand Prediction
5. Surplus / Waste Management
6. AI Food Classification
7. Recovery Decision Engine
8. Receiver Management
9. Matching Engine
10. Pickup Management
11. Notifications
12. Impact & Analytics
13. Admin Management
```

---

## 6. Frontend Route Structure

```text
/
├── login
├── register
├── onboarding
│
├── dashboard
│
├── kitchen
│   ├── meals
│   ├── meals/new
│   ├── surplus
│   ├── surplus/new
│   ├── predictions
│   └── analytics
│
├── receiver
│   ├── opportunities
│   ├── matches
│   ├── pickups
│   └── profile
│
├── admin
│   ├── overview
│   ├── users
│   ├── kitchens
│   ├── receivers
│   ├── surplus
│   └── analytics
│
└── settings
```

Role-based middleware/guards must prevent users from opening unauthorized sections.

---

## 7. Database Design

### kitchens
```text
id UUID PK
organization_id UUID FK
name TEXT
address TEXT
latitude NUMERIC
longitude NUMERIC
timezone TEXT
active BOOLEAN
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### profiles
```text
id UUID PK
full_name TEXT
email TEXT
phone TEXT
role ENUM(kitchen, receiver, admin)
organization_id UUID FK
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### organizations
```text
id UUID PK
name TEXT
organization_type ENUM(kitchen, receiver, institution, ngo, processing_unit)
address TEXT
latitude NUMERIC
longitude NUMERIC
contact_phone TEXT
created_at TIMESTAMPTZ
```

### meals
```text
id UUID PK
kitchen_id UUID FK
meal_name TEXT
meal_date DATE
meal_period ENUM(breakfast, lunch, dinner, snack, other)
expected_consumers INTEGER
planned_quantity NUMERIC
unit TEXT
created_at TIMESTAMPTZ
```

### consumption_records
```text
id UUID PK
meal_id UUID FK
actual_consumers INTEGER
prepared_quantity NUMERIC
consumed_quantity NUMERIC
leftover_quantity NUMERIC
recorded_at TIMESTAMPTZ
```

### demand_predictions
```text
id UUID PK
kitchen_id UUID FK
prediction_date DATE
meal_period TEXT
predicted_consumers INTEGER
recommended_quantity NUMERIC
predicted_surplus NUMERIC
confidence NUMERIC
model_version TEXT
created_at TIMESTAMPTZ
```

### surplus_items
```text
id UUID PK
kitchen_id UUID FK
source_meal_id UUID FK NULL
food_name TEXT
quantity NUMERIC
unit TEXT
prepared_at TIMESTAMPTZ
reported_at TIMESTAMPTZ
redistribution_deadline TIMESTAMPTZ NULL
status ENUM(active, matched, pickup_pending, picked_up, expired, recovered, disposed)
category ENUM(edible_surplus, reusable, organic, unsafe, unknown)
ai_confidence NUMERIC NULL
image_path TEXT NULL
notes TEXT NULL
created_at TIMESTAMPTZ
```

### waste_records
```text
id UUID PK
kitchen_id UUID FK
food_name TEXT
quantity NUMERIC
unit TEXT
waste_type ENUM(cooking_loss, plate_waste, surplus, spoiled, organic, other)
reason TEXT NULL
recorded_at TIMESTAMPTZ
```

### receivers
```text
id UUID PK
organization_id UUID FK
receiver_type ENUM(ngo, shelter, hostel, community_center, other)
max_capacity NUMERIC
accepted_food_types JSONB
operating_hours JSONB
priority_level INTEGER DEFAULT 1
verified BOOLEAN DEFAULT FALSE
```

### redistribution_matches
```text
id UUID PK
surplus_id UUID FK
receiver_id UUID FK
match_score NUMERIC
match_reason JSONB
status ENUM(recommended, accepted, rejected, expired)
created_at TIMESTAMPTZ
```

### pickup_requests
```text
id UUID PK
surplus_id UUID FK
receiver_id UUID FK
requested_at TIMESTAMPTZ
scheduled_at TIMESTAMPTZ NULL
picked_up_at TIMESTAMPTZ NULL
status ENUM(requested, scheduled, picked_up, cancelled)
proof_image_path TEXT NULL
notes TEXT NULL
```

### impact_records
```text
id UUID PK
surplus_id UUID FK
food_saved_quantity NUMERIC
estimated_meals_saved NUMERIC
estimated_waste_diverted NUMERIC
estimated_co2e_avoided NUMERIC NULL
estimated_value_saved NUMERIC NULL
recorded_at TIMESTAMPTZ
```

### notifications
```text
id UUID PK
user_id UUID FK
notification_type TEXT
title TEXT
message TEXT
read BOOLEAN DEFAULT FALSE
created_at TIMESTAMPTZ
```

---

## 8. Entity Relationships

```text
organizations
   ├── profiles
   ├── kitchens (through organization/profile ownership)
   └── receivers

kitchens
   ├── meals
   ├── consumption_records (through meals)
   ├── demand_predictions
   ├── surplus_items
   └── waste_records

surplus_items
   ├── redistribution_matches
   ├── pickup_requests
   └── impact_records

receivers
   ├── redistribution_matches
   └── pickup_requests
```

Use UUID primary keys and foreign keys throughout. Use Postgres indexes for common filters such as kitchen_id, receiver_id, status, and timestamps.

---

## 9. AI Architecture

### AI is an assistant, not the final authority.

Gemini may perform:
- Food image interpretation
- Food category suggestion
- Visible-condition description
- Structured extraction from user-entered notes
- Natural-language insight generation

Example AI response schema:

```json
{
  "food_type": "cooked rice",
  "category": "edible_surplus",
  "visible_condition": "appears suitable for review",
  "confidence": 0.91,
  "notes": "No obvious spoilage visible in the image"
}
```

The application must treat this as advisory output.

Never allow AI alone to declare food medically/safely consumable. Configured time windows, human confirmation, and deterministic rules must control the final recovery decision.

---

## 10. Demand Prediction MVP

Do NOT train a custom ML model in the initial MVP.

Use a simple baseline prediction engine based on:
- Historical consumer count
- Day of week
- Meal period
- Recent averages
- Optional event/holiday adjustment

A later version can replace this with a trained forecasting model without changing the product architecture.

Suggested MVP baseline:

```text
weighted_average =
  0.50 × recent_same_weekday_average +
  0.30 × recent_7_day_average +
  0.20 × same_meal_period_average
```

The exact coefficients are configurable and must be documented as MVP assumptions.

---

## 11. Redistribution Matching Engine

The matching engine is deterministic code.

### Score components

```text
Distance compatibility       40%
Quantity compatibility       25%
Urgency / time remaining     20%
Receiver capacity            10%
Priority                      5%
```

Normalize each factor to 0-100 and calculate:

```text
match_score =
  0.40 * distance_score +
  0.25 * quantity_score +
  0.20 * urgency_score +
  0.10 * capacity_score +
  0.05 * priority_score
```

The engine returns a ranked list plus machine-readable reasons.

Example:

```json
{
  "receiver_id": "...",
  "score": 94,
  "reasons": [
    "within preferred distance",
    "capacity available",
    "quantity closely matches requirement",
    "high urgency compatibility"
  ]
}
```

---

## 12. Recovery Decision Engine

```text
surplus item
   ↓
Is it configured as eligible for human redistribution?
   ├── no → secondary recovery / disposal path
   └── yes
         ↓
Is it inside configured redistribution window?
   ├── no → secondary recovery / expired
   └── yes
         ↓
Human review / kitchen confirmation
         ↓
Eligible for matching
```

The system must never present AI visual confidence as proof of food safety.

---

## 13. Food Rescue Clock

Each active surplus item may expose:

```text
Time remaining = redistribution_deadline - current_time
```

UI states:
- Safe window: normal
- Urgent window: warning
- Expired: locked from redistribution matching

The thresholds should be configurable rather than hard-coded into UI components.

---

## 14. Core API Surface

```text
POST   /api/meals
GET    /api/meals
GET    /api/meals/:id

POST   /api/consumption

POST   /api/predictions/demand
GET    /api/predictions/demand

POST   /api/surplus
GET    /api/surplus
GET    /api/surplus/:id
PATCH  /api/surplus/:id

POST   /api/ai/classify-food

POST   /api/matching/generate
GET    /api/matching/:surplusId
POST   /api/matching/:matchId/accept

POST   /api/pickups
GET    /api/pickups
PATCH  /api/pickups/:id

GET    /api/analytics/kitchen
GET    /api/analytics/admin

POST   /api/notifications/read
```

Every endpoint must validate authentication, authorization, and request data.

---

## 15. Security Requirements

- Use Supabase Auth for authentication.
- Enforce Row Level Security (RLS) in Supabase.
- Users can only access records belonging to their organization/role.
- User self-service profile updates must not be allowed to change role or organization; these are controlled fields.
- Never expose server secret keys to the browser.
- AI keys must remain server-side.
- Validate all client input using Zod.
- Validate uploaded file type and size.
- Do not store unnecessary personal data.

---

## 16. Realtime Usage

Use Supabase Realtime only where live updates improve UX:
- New surplus available
- Match accepted
- Pickup status changed
- Urgency state changed

Do not make every UI element realtime by default.

---

## 17. Folder Structure

```text
food-waste-platform/
├── app/
│   ├── (auth)/
│   ├── dashboard/
│   ├── kitchen/
│   ├── receiver/
│   ├── admin/
│   └── api/
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── kitchen/
│   ├── receiver/
│   ├── admin/
│   └── shared/
├── lib/
│   ├── supabase/
│   ├── ai/
│   ├── matching/
│   ├── prediction/
│   ├── rules/
│   └── validation/
├── types/
├── hooks/
├── utils/
├── tests/
├── supabase/
│   ├── migrations/
│   └── functions/
├── public/
├── .env.example
├── README.md
└── ARCHITECTURE.md
```

---

## 18. Environment Variables

Never commit secrets.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_MAP_STYLE_URL=
```

Only the variables explicitly required in the browser may use the `NEXT_PUBLIC_` prefix.

---

## 19. MVP Scope

### IN SCOPE
- Authentication
- Three roles
- Kitchen dashboard
- Meal recording
- Basic demand prediction
- Surplus reporting
- Food image analysis
- Recovery classification
- Deterministic receiver matching
- Pickup workflow
- Realtime status updates
- Analytics dashboard
- Impact metrics
- Responsive mobile-first UI

### OUT OF SCOPE FOR V1
- Native Android/iOS app
- IoT hardware integration
- Custom computer-vision training
- Custom forecasting model
- Payment gateway
- Complex logistics optimization
- Full external NGO verification network
- Blockchain
- Microservices
- Kubernetes
- Multi-country compliance

---

## 20. Development Rules for AI Coding Agents

1. Read `ARCHITECTURE.md` before modifying the codebase.
2. Do not change the technology stack without explicit approval.
3. Do not introduce a new external service when an existing chosen service can handle the requirement.
4. Do not create duplicate backend layers.
5. Do not move business rules into UI components.
6. Keep AI calls server-side.
7. Keep matching and safety-related decisions deterministic.
8. Write reusable components and typed interfaces.
9. Use Zod at external boundaries.
10. Add tests for decision-engine calculations and critical workflows.
11. Keep MVP features functional before adding visual polish.
12. Never fabricate data in production code. Mock data must be clearly isolated and labeled.
13. Preserve database migrations and never silently destroy existing data.
14. Prefer small, reviewable commits.
15. Update documentation when architecture or contracts change.

---

## 21. Build Order

### Phase 0 — Foundation
- Create Next.js TypeScript project
- Configure Tailwind + shadcn/ui
- Configure Supabase
- Configure GitHub
- Create environment template
- Add basic app shell

### Phase 1 — Authentication
- Supabase Auth
- Role selection
- Protected routes
- Organization/profile setup

### Phase 2 — Core Data
- Database migrations
- Kitchen
- Receiver
- Meal
- Consumption
- Surplus tables

### Phase 3 — Core Workflow
- Meal entry
- Surplus entry
- Surplus status lifecycle
- Receiver management

### Phase 4 — Intelligence
- Demand prediction baseline
- Gemini food classification
- Recovery decision engine
- Matching engine

### Phase 5 — Operations
- Pickup requests
- Realtime status
- Food rescue clock
- Notifications

### Phase 6 — Analytics
- Kitchen analytics
- Recovery metrics
- Waste trends
- Impact dashboard

### Phase 7 — Hardening
- RLS review
- Validation
- Unit tests
- E2E tests
- Error handling
- Responsive QA
- Deployment

---

## 22. Architecture Decision Summary

The MVP is a **modular monolith**:

```text
Next.js application
        │
        ├── React frontend
        ├── Route Handlers / Server Actions
        ├── AI integration
        ├── Matching engine
        ├── Prediction engine
        └── Validation / business rules
                │
                ↓
            Supabase
                ├── PostgreSQL
                ├── Auth
                ├── Storage
                └── Realtime
```

The guiding principle is:

> **Use AI for perception, prediction, and explanation; use deterministic application logic for critical decisions and workflow state.**

This architecture is intentionally simple enough for a college MVP, while leaving clean extension points for IoT, advanced ML forecasting, logistics optimization, and native apps later.
