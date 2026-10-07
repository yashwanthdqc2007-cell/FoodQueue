# Project Structure & Implementation Blueprint

## 1. Overview & Architecture Pattern

The **AI Food Waste Intelligence & Redistribution Platform** (`food-rescue-ai`) is built as a **Modular Monolith** using Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, and Supabase (PostgreSQL, Auth, Storage, Realtime), with Google Gemini API for perception and structured classification.

### Locked Technology Stack
- **Framework:** Next.js (App Router, TypeScript)
- **UI & Styling:** React, Tailwind CSS, shadcn/ui, Lucide React
- **Visualization & Maps:** Recharts, MapLibre GL JS
- **Backend & API:** Next.js Route Handlers, Server Actions, Zod validation
- **Data & Auth:** Supabase PostgreSQL, Supabase Auth, Supabase Storage, Supabase Realtime
- **AI Engine:** Gemini API (server-side structured JSON generation)
- **Testing:** Vitest (unit & decision engine logic), Playwright (E2E)

No additional backend frameworks (Express, FastAPI), ORMs (Prisma, Drizzle), or state libraries (Redux, Zustand) are permitted.

---

## 2. Repository Directory Layout

```text
food-rescue-ai/
├── .github/
│   └── workflows/                # CI / CD workflows (Vitest, Playwright, Lint)
├── app/                          # Next.js App Router root
│   ├── (auth)/                   # Authentication route group (unauthenticated layout)
│   │   ├── login/
│   │   │   └── page.tsx          # Login page (email/password)
│   │   ├── register/
│   │   │   └── page.tsx          # User registration
│   │   └── onboarding/
│   │       └── page.tsx          # Post-signup role & organization onboarding
│   ├── (dashboard)/              # Authenticated layout with navigation shell
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Role-aware landing / redirect dashboard
│   │   ├── kitchen/              # Kitchen management modules
│   │   │   ├── layout.tsx        # Kitchen sub-layout / role guard
│   │   │   ├── page.tsx          # Kitchen overview
│   │   │   ├── meals/
│   │   │   │   ├── page.tsx      # Meal schedules & history
│   │   │   │   └── new/
│   │   │   │       └── page.tsx  # Plan new meal entry
│   │   │   ├── consumption/
│   │   │   │   └── page.tsx      # Consumption & leftover logging
│   │   │   ├── surplus/
│   │   │   │   ├── page.tsx      # Active surplus items & statuses
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx  # Surplus details, clock & matching view
│   │   │   │   └── new/
│   │   │   │       └── page.tsx  # Report surplus (with optional AI image scan)
│   │   │   ├── predictions/
│   │   │   │   └── page.tsx      # Demand predictions vs actuals
│   │   │   └── analytics/
│   │   │       └── page.tsx      # Kitchen waste & diversion metrics
│   │   ├── receiver/             # Receiver / NGO modules
│   │   │   ├── layout.tsx        # Receiver sub-layout / role guard
│   │   │   ├── page.tsx          # Receiver overview & active alerts
│   │   │   ├── opportunities/
│   │   │   │   └── page.tsx      # Available nearby surplus matching feed
│   │   │   ├── matches/
│   │   │   │   └── page.tsx      # Incoming match recommendations & actions
│   │   │   ├── pickups/
│   │   │   │   ├── page.tsx      # Scheduled & completed pickups
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx  # Pickup execution & proof upload
│   │   │   └── profile/
│   │   │       └── page.tsx      # Receiver capacity, accepted foods, operating hours
│   │   ├── admin/                # Admin management modules
│   │   │   ├── layout.tsx        # Admin sub-layout / role guard
│   │   │   ├── page.tsx          # System-wide metrics overview
│   │   │   ├── users/
│   │   │   │   └── page.tsx      # User management & profile oversight
│   │   │   ├── organizations/
│   │   │   │   └── page.tsx      # Organization approvals & settings
│   │   │   ├── kitchens/
│   │   │   │   └── page.tsx      # Kitchen profiles & compliance
│   │   │   ├── receivers/
│   │   │   │   └── page.tsx      # Receiver verification & capacity review
│   │   │   ├── surplus/
│   │   │   │   └── page.tsx      # System-wide surplus audit log
│   │   │   └── analytics/
│   │   │       └── page.tsx      # Global environmental & food rescue impact
│   │   └── settings/
│   │       └── page.tsx          # Account settings & notification preferences
│   ├── api/                      # Next.js Route Handlers
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts      # Supabase Auth callback handler
│   │   ├── profile/
│   │   │   └── route.ts          # Get authenticated user profile & status
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   │   ├── route.ts      # List users & assignment status
│   │   │   │   └── assign/
│   │   │   │       └── route.ts  # Admin-only role & organization assignment
│   │   │   └── organizations/
│   │   │       └── route.ts      # Admin-only organization creation
│   │   ├── meals/
│   │   │   ├── route.ts          # List / Create meals
│   │   │   └── [id]/
│   │   │       └── route.ts      # Get meal details
│   │   ├── consumption/
│   │   │   └── route.ts          # Record consumption & leftovers
│   │   ├── predictions/
│   │   │   └── demand/
│   │   │       └── route.ts      # Generate / fetch demand forecasts
│   │   ├── surplus/
│   │   │   ├── route.ts          # List / Create surplus items
│   │   │   └── [id]/
│   │   │       └── route.ts      # Get / Update surplus status & details
│   │   ├── ai/
│   │   │   └── classify-food/
│   │   │       └── route.ts      # Gemini visual food classification & tagging
│   │   ├── matching/
│   │   │   ├── generate/
│   │   │   │   └── route.ts      # Run deterministic matching engine for surplus
│   │   │   ├── [surplusId]/
│   │   │   │   └── route.ts      # Retrieve ranked matches for a surplus item
│   │   │   └── [matchId]/
│   │   │       ├── accept/
│   │   │       │   └── route.ts  # Receiver / Kitchen accepts match
│   │   │       └── reject/
│   │   │           └── route.ts  # Reject match recommendation
│   │   ├── pickups/
│   │   │   ├── route.ts          # List / Create pickup requests
│   │   │   └── [id]/
│   │   │       └── route.ts      # Update pickup status (scheduled/picked_up/cancelled)
│   │   ├── analytics/
│   │   │   ├── kitchen/
│   │   │   │   └── route.ts      # Aggregated kitchen analytics
│   │   │   └── admin/
│   │   │       └── route.ts      # Global platform analytics & impact
│   │   └── notifications/
│   │       ├── route.ts          # List notifications
│   │       └── read/
│   │           └── route.ts      # Mark notifications as read
│   ├── layout.tsx                # Root layout (providers, fonts, metadata)
│   └── page.tsx                  # Landing page (hero, value proposition, sign in link)
├── components/                   # React components
│   ├── ui/                       # shadcn/ui primitive components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── toast.tsx
│   │   ├── tabs.tsx
│   │   └── progress.tsx
│   ├── dashboard/                # Shared layout & shell components
│   │   ├── app-shell.tsx         # Responsive sidebar & header shell
│   │   ├── nav-items.tsx         # Role-filtered navigation config
│   │   ├── user-nav.tsx          # User profile avatar & logout
│   │   └── notifications-popover.tsx # Realtime notification center
│   ├── kitchen/                  # Kitchen-specific UI components
│   │   ├── meal-form.tsx         # Plan meal form
│   │   ├── consumption-form.tsx  # Consumption logging modal/form
│   │   ├── surplus-card.tsx      # Surplus item summary card
│   │   ├── surplus-form.tsx      # Surplus declaration with image scan
│   │   ├── rescue-clock.tsx      # Visual countdown timer with status colors
│   │   └── prediction-chart.tsx  # Demand vs actuals chart
│   ├── receiver/                 # Receiver-specific UI components
│   │   ├── match-card.tsx        # Incoming opportunity card with match score
│   │   ├── pickup-status-badge.tsx # Formatted pickup status tag
│   │   ├── proof-upload-modal.tsx # Pickup proof image upload dialog
│   │   └── capacity-widget.tsx   # Capacity usage visualization
│   ├── admin/                    # Admin-specific UI components
│   │   ├── metric-card.tsx       # KPI stat summary card
│   │   ├── organization-table.tsx# Organization verification table
│   │   ├── receiver-approval.tsx # Receiver onboarding approval drawer
│   │   └── waste-category-pie.tsx# Waste breakdown Recharts pie
│   └── shared/                   # Cross-role reusable components
│       ├── map-view.tsx          # MapLibre GL map component for routing/location
│       ├── image-uploader.tsx    # Secure client uploader with Supabase Storage
│       ├── status-badge.tsx      # Generic enum badge (surplus, match, pickup)
│       ├── empty-state.tsx       # Empty content placeholder
│       └── error-boundary.tsx    # Standard React error boundary
├── lib/                          # Core business logic, engine implementations & clients
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client (publishable key)
│   │   ├── server.ts             # Server-side Supabase client (cookies/session aware)
│   │   ├── admin.ts              # Privileged admin Supabase client (SUPABASE_SECRET_KEY, restricted to trusted server)
│   │   └── middleware.ts         # Session refresh & route protection helper
│   ├── ai/
│   │   ├── gemini.ts             # Gemini SDK initialization & typed caller
│   │   ├── prompts.ts            # System instructions & structured prompt templates
│   │   └── parser.ts             # JSON schema validator for Gemini advisory outputs
│   ├── matching/
│   │   ├── engine.ts             # Deterministic redistribution scoring engine
│   │   ├── distance.ts           # Haversine distance calculator
│   │   └── weights.ts            # Configurable weights (distance, qty, urgency, capacity, priority)
│   ├── prediction/
│   │   ├── baseline.ts           # MVP weighted moving-average demand estimator
│   │   └── factors.ts            # Weekday / meal period multiplier logic
│   ├── rules/
│   │   ├── recovery-decision.ts  # Deterministic pathway logic (edible/reusable/organic/unsafe)
│   │   ├── food-safety-clock.ts  # Urgency categorization (safe, urgent, expired)
│   │   └── impact-calculator.ts  # Co2e and meal diversion formula calculations
│   └── validation/
│       ├── auth.ts               # Auth & onboarding Zod schemas
│       ├── meal.ts               # Meal & consumption Zod schemas
│       ├── surplus.ts            # Surplus item & AI classification Zod schemas
│       ├── receiver.ts           # Receiver capacity & operating hours Zod schemas
│       ├── matching.ts           # Match decision Zod schemas
│       └── pickup.ts             # Pickup lifecycle Zod schemas
├── types/                        # TypeScript type declarations
│   ├── database.types.ts         # Supabase auto-generated/inferred database schema types
│   ├── models.ts                 # Domain domain interfaces & composite types
│   ├── ai.ts                     # AI classification response interfaces
│   ├── matching.ts               # Match score & explanation types
│   └── api.ts                    # Standard API response wrappers & error codes
├── hooks/                        # Custom React hooks
│   ├── use-auth.ts               # Current user profile, role & organization hook
│   ├── use-realtime-surplus.ts   # Realtime listener for active surplus updates
│   ├── use-realtime-pickups.ts   # Realtime listener for pickup status transitions
│   └── use-countdown.ts          # Tick hook for food rescue clock
├── utils/                        # Formatting & helper utilities
│   ├── date.ts                   # Date formatting, timezone conversion & relative time
│   ├── formatters.ts             # Number, currency, and weight unit formatters
│   └── errors.ts                 # Standardized AppError and API response constructors
├── tests/                        # Test suite
│   ├── unit/
│   │   ├── matching-engine.test.ts # Vitest suite for deterministic matching formulas
│   │   ├── prediction.test.ts      # Vitest suite for demand forecasting algorithms
│   │   ├── recovery-rules.test.ts  # Vitest suite for recovery decision trees
│   │   └── impact-calc.test.ts     # Vitest suite for CO2e & meals saved formulas
│   └── e2e/
│       ├── auth.spec.ts          # Playwright test for login & onboarding
│       ├── kitchen-flow.spec.ts  # Playwright test for meal -> surplus -> match
│       └── receiver-flow.spec.ts # Playwright test for match -> pickup -> completion
├── supabase/
│   ├── migrations/
│   │   └── 0001_initial_schema.sql # Core PostgreSQL schema migration
│   ├── seed.sql                  # Seed data for local & staging environments
│   └── config.toml               # Supabase CLI local configuration
├── docs/
│   └── SUPABASE_SETUP.md         # Database & cloud storage setup guide
├── proxy.ts                      # Next.js Edge proxy for session & RBAC routing
├── ARCHITECTURE.md               # Master system architecture & specification
├── DATABASE_RULES.md             # Database schema, RLS, and security contract
├── API_SPEC.md                   # Complete REST API specification
├── PROJECT_STRUCTURE.md          # Implementation blueprint & structure (this file)
└── README.md                     # Project documentation index
```

---

## 3. Middleware & Route Protection Strategy

Next.js `middleware.ts` runs on Edge runtime before hitting any page route or API:

1. **Session Validation:** Uses `@supabase/ssr` to read the auth session cookie.
2. **Unauthenticated Redirects:** Non-authenticated requests to `/dashboard/*`, `/kitchen/*`, `/receiver/*`, `/admin/*`, or `/settings` redirect to `/login`.
3. **Role-Based Access Control (RBAC):**
   - Profile `role === 'kitchen'` can access `/kitchen/*` and `/dashboard`. Blocked from `/receiver/*`, `/admin/*`.
   - Profile `role === 'receiver'` can access `/receiver/*` and `/dashboard`. Blocked from `/kitchen/*`, `/admin/*`.
   - Profile `role === 'admin'` can access all dashboard routes including `/admin/*`.
4. **Onboarding Gate:** Authenticated users without an associated `organization_id` are automatically redirected to `/onboarding` before they can access operational pages.

---

## 4. State & Communication Architecture

- **Server-Side Data Fetching:** Next.js Server Components and Route Handlers query Supabase directly using RLS-constrained authenticated sessions.
- **Client-Side Mutations:** Standardized `fetch` calls to `/api/*` endpoints with Zod payload validation and structured JSON error responses.
- **Realtime Subscriptions:** Targeted Supabase Realtime channels configured only for:
  - `surplus_items` changes within accessible kitchens/receiver matches
  - `pickup_requests` status changes
  - `notifications` for the logged-in user

---

## 5. Pre-Implementation Checklist

Before generating code or executing application scaffolding, the following criteria must be reviewed and confirmed:

- [ ] **Architecture Reviewed:** `ARCHITECTURE.md` reviewed and locked; no out-of-scope frameworks added.
- [ ] **Database Schema Reviewed:** All 13 tables, 9 enum types, triggers, and foreign keys in `0001_initial_schema.sql` verified.
- [ ] **RLS Policies Reviewed:** Verified that every table enforces RLS and that security-definer helper functions (`can_access_kitchen`, `can_access_surplus`, `is_org_member`, `is_admin`) are intact.
- [ ] **Storage Strategy Reviewed:** Buckets `food-images` and `pickup-proofs` defined with private access and 5MB size restrictions.
- [ ] **Authentication & Onboarding Model Reviewed:** Verified that profile triggers create initial records and that organization assignment is securely mediated.
- [ ] **API Contract Reviewed:** `API_SPEC.md` verified for all required endpoints, Zod schemas, and standard `{ data, error }` response envelopes.
- [ ] **Environment Variable Contract Defined:** Browser (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MAP_STYLE_URL`) and server-only (`SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`) variables separated cleanly.
- [ ] **No Secrets Committed:** Verified that no production keys or credentials exist in git-tracked files.
