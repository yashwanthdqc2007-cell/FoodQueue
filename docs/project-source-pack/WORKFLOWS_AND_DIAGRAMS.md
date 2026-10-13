# FoodQueue — Workflows, Process Maps & Technical Diagrams

This document collects the complete architectural and operational diagrams for the **FoodQueue** platform. All diagrams use GitHub-flavored Mermaid syntax and are followed by detailed, plain-language walkthroughs of data flows, state machines, and edge cases.

---

## 1. System Architecture Diagram

```mermaid
graph TB
    subgraph Client_Layer ["Client Layer (Browser)"]
        UI_Kitchen["Kitchen Dashboard (/kitchen)"]
        UI_Receiver["Receiver Portal (/receiver)"]
        UI_Admin["Admin Center (/admin)"]
        UI_Shared["Shared Components (MapView, RealtimeBadge)"]
    end

    subgraph App_Server_Layer ["Application & Server Layer (Next.js 16 + Turbopack)"]
        Proxy["Proxy / Middleware (proxy.ts)"]
        AuthRoutes["Auth Handlers (/auth/*)"]
        
        subgraph Route_Handlers ["Next.js Route Handlers (/api/*)"]
            API_Meals["Meal & Consumption APIs"]
            API_Predict["Demand Prediction API"]
            API_Surplus["Surplus & AI APIs"]
            API_Match["Matching Engine APIs"]
            API_Pickup["Pickup & Proof APIs"]
            API_Analytics["Analytics APIs (Kitchen/Receiver/Admin)"]
            API_Admin["Admin Governance APIs"]
        end

        subgraph Core_Engines ["Deterministic Business Logic Engines"]
            Engine_Pred["Prediction Baseline (mvp-baseline-v1)"]
            Engine_AI["AI Classification & Normalizer"]
            Engine_Rules["Recovery & Rescue Clock Engines"]
            Engine_Match["Haversine & Scoring Engine"]
            Engine_State["Pickup State Machine"]
            Engine_Impact["Impact Calculator (0.4 kg/meal)"]
        end
    end

    subgraph Platform_Data_Layer ["Platform & Data Layer (Supabase Cloud)"]
        Supa_Auth["Supabase Auth (JWT / Sessions)"]
        Supa_PG["PostgreSQL Database (12 Tables, RLS Enabled)"]
        Supa_Realtime["Supabase Realtime (WebSocket Publication)"]
        
        subgraph Storage_Buckets ["Private Storage Buckets (Signed URLs)"]
            Bucket_Food["food-images (Max 5MB)"]
            Bucket_Proofs["pickup-proofs (Max 5MB)"]
        end
    end

    subgraph External_Services ["External Cloud Services"]
        Gemini_API["Google Gemini 2.5 Flash (Vision API)"]
        OpenFreeMap["OpenFreeMap / MapLibre Tile Server"]
    end

    %% Client to Server Connections
    UI_Kitchen -->|HTTP / JSON| Proxy
    UI_Receiver -->|HTTP / JSON| Proxy
    UI_Admin -->|HTTP / JSON| Proxy
    Proxy --> Route_Handlers
    UI_Shared -->|Vector Tiles| OpenFreeMap
    UI_Shared -->|WebSocket Listen| Supa_Realtime

    %% Server Internal Wiring
    API_Meals --> Engine_Pred
    API_Surplus --> Engine_AI
    API_Surplus --> Engine_Rules
    API_Match --> Engine_Match
    API_Pickup --> Engine_State
    API_Pickup --> Engine_Impact

    %% Server to External Services
    Engine_AI -->|Base64 Image + Prompt| Gemini_API

    %% Server to Supabase
    Route_Handlers -->|Server Client (Cookie Auth)| Supa_Auth
    Route_Handlers -->|RLS Authenticated Client| Supa_PG
    API_Admin -->|Service Role Client| Supa_PG
    API_Surplus -->|Read / Write| Bucket_Food
    API_Pickup -->|Read / Write| Bucket_Proofs
    Supa_PG -.->|Postgres Changes| Supa_Realtime
```

### Architecture Walkthrough
1. **Client Layer**: Pure React 19 Client and Server Components styled with Tailwind CSS. Navigation bars instantiate the `useRealtimeSync` hook to maintain live operational synchronization.
2. **Application Server Layer**: Hosted on Next.js 16 with Turbopack. Incoming HTTP requests pass through `proxy.ts` (the Next.js 16 session proxy) before reaching Route Handlers. All request payloads are strictly validated using Zod schemas.
3. **Core Engines**: Reusable, pure-function mathematical engines executing deterministic calculations (prediction baseline, distance, eligibility, scoring, impact).
4. **Data Layer**: Supabase PostgreSQL enforcing Row-Level Security (RLS) on all 12 tables. Multi-tenant access is filtered at the database engine level using security-definer helper functions.
5. **Storage Layer**: Two dedicated private buckets (`food-images`, `pickup-proofs`) accessible only via time-limited 3600-second signed URLs.
6. **External Integrations**: Google Gemini API invoked exclusively server-side via `@google/genai` (secret key never leaks to client); MapLibre GL connects directly to OpenFreeMap vector tile servers.

---

## 2. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    organizations ||--o{ profiles : "employs"
    organizations ||--o{ kitchens : "operates"
    organizations ||--o{ receivers : "maintains"
    
    kitchens ||--o{ meals : "schedules"
    kitchens ||--o{ demand_predictions : "generates"
    kitchens ||--o{ surplus_items : "declares"
    kitchens ||--o{ waste_records : "logs"

    meals ||--o| consumption_records : "audited_by"
    meals ||--o{ surplus_items : "yields"

    surplus_items ||--o{ redistribution_matches : "matched_in"
    surplus_items ||--o{ pickup_requests : "transacted_via"
    surplus_items ||--o| impact_records : "quantified_by"

    receivers ||--o{ redistribution_matches : "considered_for"
    receivers ||--o{ pickup_requests : "fulfills"

    auth_users ||--|| profiles : "identifies"
    auth_users ||--o{ notifications : "receives"

    organizations {
        uuid id PK
        text name
        organization_type organization_type
        text address
        numeric latitude
        numeric longitude
        text contact_phone
        timestamptz created_at
    }

    profiles {
        uuid id PK,FK
        text full_name
        text email
        text phone
        app_role role
        uuid organization_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    kitchens {
        uuid id PK
        uuid organization_id FK
        text name
        text address
        numeric latitude
        numeric longitude
        text timezone
        boolean active
        timestamptz created_at
        timestamptz updated_at
    }

    meals {
        uuid id PK
        uuid kitchen_id FK
        text meal_name
        date meal_date
        meal_period meal_period
        integer expected_consumers
        numeric planned_quantity
        text unit
        timestamptz created_at
    }

    consumption_records {
        uuid id PK
        uuid meal_id FK
        integer actual_consumers
        numeric prepared_quantity
        numeric consumed_quantity
        numeric leftover_quantity
        timestamptz recorded_at
    }

    demand_predictions {
        uuid id PK
        uuid kitchen_id FK
        date prediction_date
        meal_period meal_period
        integer predicted_consumers
        numeric recommended_quantity
        numeric predicted_surplus
        numeric confidence
        text model_version
        timestamptz created_at
    }

    surplus_items {
        uuid id PK
        uuid kitchen_id FK
        uuid source_meal_id FK
        text food_name
        numeric quantity
        text unit
        timestamptz prepared_at
        timestamptz reported_at
        timestamptz redistribution_deadline
        surplus_status status
        surplus_category category
        numeric ai_confidence
        text image_path
        text notes
        timestamptz created_at
    }

    receivers {
        uuid id PK
        uuid organization_id FK
        receiver_type receiver_type
        numeric max_capacity
        jsonb accepted_food_types
        jsonb operating_hours
        integer priority_level
        boolean verified
        timestamptz created_at
        timestamptz updated_at
    }

    redistribution_matches {
        uuid id PK
        uuid surplus_id FK
        uuid receiver_id FK
        numeric match_score
        jsonb match_reason
        match_status status
        timestamptz created_at
    }

    pickup_requests {
        uuid id PK
        uuid surplus_id FK
        uuid receiver_id FK
        timestamptz requested_at
        timestamptz scheduled_at
        timestamptz picked_up_at
        pickup_status status
        text proof_image_path
        text notes
    }

    impact_records {
        uuid id PK
        uuid surplus_id FK
        numeric food_saved_quantity
        numeric estimated_meals_saved
        numeric estimated_waste_diverted
        numeric estimated_co2e_avoided
        numeric estimated_value_saved
        timestamptz recorded_at
    }

    waste_records {
        uuid id PK
        uuid kitchen_id FK
        text food_name
        numeric quantity
        text unit
        waste_type waste_type
        text reason
        timestamptz recorded_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        text notification_type
        text title
        text message
        boolean read
        timestamptz created_at
    }
```

### Data Model Rules & Integrity Constraints
- **Multi-Tenant Scoping**: All operational tables (`meals`, `kitchens`, `surplus_items`, `receivers`) cascade from `organizations`.
- **Primary & Foreign Keys**: Standardized UUID primary keys (`gen_random_uuid()`).
- **Check Constraints**: Non-negative consumer numbers (`check (expected_consumers >= 0)`), strictly positive surplus quantities (`check (quantity > 0)`), confidence clamped between 0 and 1, match scores between 0 and 100.
- **Unique Match Constraint**: `unique (surplus_id, receiver_id)` on `redistribution_matches` guarantees no duplicate ranking records are inserted per candidate pair.
- **Idempotent Impact Link**: `impact_records` maintains a 1-to-1 relationship with `surplus_items` via `surplus_id` uniqueness guards in the API handler.

---

## 3. End-to-End Kitchen Meal Planning to Redistribution Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Kitchen as Kitchen Operator
    participant App as Next.js Web App
    participant Engine as Business Logic Engines
    participant DB as Supabase PostgreSQL
    actor Receiver as Verified Receiver

    Note over Kitchen, DB: Phase A: Meal Planning & Demand Estimation
    Kitchen->>App: Navigate to New Meal (/kitchen/meals/new)
    App->>Engine: Run computeDemandPrediction(targetDate, unit)
    Engine->>DB: Query 28-day historical consumption
    DB-->>Engine: Return past attendance & portion records
    Engine-->>App: Display recommended preparation & confidence
    Kitchen->>App: Confirm meal plan (Name, Date, Expected Consumers)
    App->>DB: INSERT into public.meals

    Note over Kitchen, DB: Phase B: Consumption Audit & Surplus Detection
    Kitchen->>App: Audit Completed Meal (/kitchen/meals/[id])
    Kitchen->>App: Submit actual consumers, prepared & consumed quantities
    App->>Engine: Validate invariant (prepared >= consumed)
    App->>DB: INSERT into public.consumption_records
    
    alt Leftover Quantity > 0
        Kitchen->>App: Open Surplus Handoff Modal
        Kitchen->>App: Upload food photo & specify deadline
        App->>DB: Upload photo to private 'food-images' bucket
        App->>Engine: Trigger AI Classification (gemini-2.5-flash)
        Engine-->>App: Return Food Type, Category & Confidence (Advisory)
        App->>DB: INSERT into public.surplus_items (status = 'active')
    end

    Note over Kitchen, Receiver: Phase C: Smart Matching & Receiver Handshake
    Kitchen->>App: Request Match Generation (/api/matching/generate)
    App->>Engine: Run evaluateReceiverEligibility() & computeMatchScore()
    Engine->>DB: Fetch verified receivers & compute Haversine distance
    Engine-->>App: Return ranked candidate list with explainable reasons
    App->>DB: UPSERT into public.redistribution_matches (status = 'recommended')
    
    Receiver->>App: View Opportunities (/receiver/opportunities)
    Receiver->>App: Accept Match (/api/matching/[id]/accept)
    App->>DB: UPDATE match status = 'accepted'
    App->>DB: INSERT into public.pickup_requests (status = 'requested')
    App->>DB: UPDATE surplus status = 'matched'

    Note over Kitchen, Receiver: Phase D: Pickup Execution, Proof & Impact Attribution
    Kitchen->>App: Confirm Pickup Window (/api/pickups/[id])
    App->>DB: UPDATE pickup status = 'scheduled'
    Receiver->>App: Arrive at Kitchen & Upload Handover Proof Photo
    App->>DB: Upload image to private 'pickup-proofs' bucket
    Receiver->>App: Confirm Collection (/api/pickups/[id])
    App->>Engine: Validate role permissions & state transition
    App->>DB: UPDATE pickup status = 'picked_up'
    App->>DB: UPDATE surplus status = 'picked_up'
    App->>Engine: Run calculateRedistributionImpact(quantity, unit)
    Engine-->>App: Quantify meals (0.4kg), CO2e (2.5x), INR (60x)
    App->>DB: INSERT into public.impact_records
    App-->>Kitchen: Live badge refresh: Impact credited!
    App-->>Receiver: Live badge refresh: Community impact logged!
```

---

## 4. Surplus Intelligence & Recovery Decision Tree

```mermaid
flowchart TD
    Start(["Surplus Reported"]) --> CheckStatus{"Is Status Terminal?"}
    
    CheckStatus -- "status = 'disposed'" --> EndDisposed["Path: DISPOSE<br>Action: Log in waste tracking"]
    CheckStatus -- "status = 'recovered'" --> EndRecovered["Path: RECOVERY<br>Action: Confirm secondary intake"]
    CheckStatus -- "status = 'active' or 'matched'" --> CheckCategory{"Evaluate Food Category"}

    CheckCategory -- "category = 'unsafe'" --> ActionUnsafe["Path: DISPOSE<br>Urgency: EXPIRED<br>Action: Isolate and discard immediately"]
    
    CheckCategory -- "category in ('organic', 'reusable', 'edible_surplus', 'unknown')" --> CheckClock{"Check Rescue Clock<br>(Deadline - Now)"}

    CheckClock -- "Deadline Passed (Diff <= 0)" --> ExpiredBranch{"Evaluate Category on Expiry"}
    ExpiredBranch -- "organic or reusable" --> ExpiredOrganic["Path: RECOVERY<br>Action: Divert to composting or bio-processing"]
    ExpiredBranch -- "edible_surplus or unknown" --> ExpiredEdible["Path: RECOVERY<br>Action: Divert to secondary animal feed or disposal"]

    CheckClock -- "Time Remaining > 0" --> ActiveBranch{"Evaluate Active Category"}
    ActiveBranch -- "organic" --> ActiveOrganic["Path: RECOVERY<br>Action: Route to partner bio-digester/composter"]
    ActiveBranch -- "reusable" --> ActiveReusable["Path: RECOVERY<br>Action: Secondary culinary repurposing"]
    ActiveBranch -- "unknown" --> ActiveUnknown["Path: REDISTRIBUTE<br>Action: Run AI visual scan & find receivers"]
    
    ActiveBranch -- "edible_surplus" --> CheckUrgency{"Remaining Minutes"}
    CheckUrgency -- "<= 60 Minutes" --> UrgentEdible["Path: REDISTRIBUTE<br>Urgency: URGENT<br>Action: Expedited priority matching"]
    CheckUrgency -- "> 60 Minutes" --> StandardEdible["Path: REDISTRIBUTE<br>Urgency: ACTIVE<br>Action: Standard community redistribution"]

    classDef red fill:#fee2e2,stroke:#ef4444,stroke-width:2px;
    classDef amber fill:#fef3c7,stroke:#f59e0b,stroke-width:2px;
    classDef green fill:#dcfce7,stroke:#10b981,stroke-width:2px;
    classDef blue fill:#e0e7ff,stroke:#6366f1,stroke-width:2px;

    class ActionUnsafe,EndDisposed red;
    class UrgentEdible,ExpiredEdible amber;
    class StandardEdible,ActiveUnknown green;
    class ActiveOrganic,ActiveReusable,ExpiredOrganic,EndRecovered blue;
```

---

## 5. Smart Redistribution Matching Flow

```mermaid
flowchart TD
    SubStart(["Generate Matches Requested<br>(surplus_id)"]) --> FetchSurplus["Fetch Surplus Record & Kitchen GPS Coordinates"]
    FetchSurplus --> CheckActive{"Surplus Active & Unexpired?"}
    
    CheckActive -- No --> Err422["Return 422 Unprocessable Entity<br>(Surplus not eligible for matching)"]
    CheckActive -- Yes --> FetchReceivers["Batch Fetch All Receivers & Organization Metadata"]
    
    FetchReceivers --> LoopReceivers["Iterate Through Each Candidate Receiver"]
    
    subgraph Pre_Filtering ["Deterministic Eligibility Pre-Filter"]
        LoopReceivers --> Gate1{"Receiver Verified?<br>(verified == true)"}
        Gate1 -- No --> Ineligible["Mark Ineligible: RECEIVER_NOT_VERIFIED"]
        Gate1 -- Yes --> Gate2{"Capacity Sufficient?<br>(maxCapacity >= surplusQuantity)"}
        Gate2 -- No --> Ineligible2["Mark Ineligible: INSUFFICIENT_CAPACITY"]
        Gate2 -- Yes --> Gate3{"Cross-Org Boundary?<br>(receiverOrg != kitchenOrg)"}
        Gate3 -- No --> Ineligible3["Mark Ineligible: SAME_ORGANIZATION_BOUNDARY"]
        Gate3 -- Yes --> Gate4{"Food Type Accepted?<br>(acceptedFoodTypes matches)"}
        Gate4 -- No --> Ineligible4["Mark Ineligible: INCOMPATIBLE_FOOD_TYPE"]
        Gate4 -- Yes --> Eligible["Mark Eligible for Scoring"]
    end

    subgraph Scoring_Engine ["Multi-Factor Weighted Scoring Engine"]
        Eligible --> CalcDist["Haversine Distance (km) -> Distance Score (40%)"]
        Eligible --> CalcQty["Quantity Fit Ratio -> Quantity Score (25%)"]
        Eligible --> CalcUrg["Rescue Clock Status -> Urgency Score (20%)"]
        Eligible --> CalcCap["Intake Capacity Scale -> Capacity Score (10%)"]
        Eligible --> CalcPrio["Receiver Priority Level (1-5) -> Priority Score (5%)"]
        
        CalcDist & CalcQty & CalcUrg & CalcCap & CalcPrio --> WeightedSum["Compute Weighted Sum<br>Final Score strictly in [0, 100]"]
        WeightedSum --> GenerateReason["Synthesize Human-Readable Explainable Reasons"]
    end

    Ineligible & Ineligible2 & Ineligible3 & Ineligible4 --> CollectResults
    GenerateReason --> CollectResults["Collect Candidate Result Object"]
    
    CollectResults --> FilterEligible["Filter Only Eligible Candidates"]
    FilterEligible --> SortRank["Sort Descending by finalScore"]
    SortRank --> UpsertDB["UPSERT into public.redistribution_matches<br>(onConflict: surplus_id, receiver_id)"]
    UpsertDB --> ReturnRanked["Return 200 OK with Ranked Matches & Metadata"]
```

---

## 6. Pickup Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> requested : Receiver or Kitchen accepts match

    state "requested" as requested {
        description : Pickup initiated; awaiting collection window confirmation.
    }

    state "scheduled" as scheduled {
        description : Collection window confirmed by Kitchen or Admin.
    }

    state "picked_up (TERMINAL)" as picked_up {
        description : Food collected; proof photo stored; impact records created.
    }

    state "cancelled (TERMINAL)" as cancelled {
        description : Pickup aborted by either party or admin.
    }

    requested --> scheduled : Kitchen or Admin confirms (scheduledAt)
    requested --> picked_up : Direct Handover (Receiver or Admin)
    requested --> cancelled : Kitchen, Receiver, or Admin aborts

    scheduled --> picked_up : Standard Collection (Receiver confirms with proof)
    scheduled --> cancelled : Kitchen, Receiver, or Admin aborts

    picked_up --> [*]
    cancelled --> [*]

    note right of picked_up
        TERMINAL STATE:
        - Surplus status becomes 'picked_up'
        - impact_records row inserted
        - Further modifications return 409 Conflict
    end note

    note right of cancelled
        TERMINAL STATE:
        - Surplus released back or marked inactive
        - Further modifications return 409 Conflict
    end note
```

### Transition & Authorization Matrix
| Current State | Target State | Permitted Roles | Side Effects |
| :--- | :--- | :--- | :--- |
| `requested` | `scheduled` | `kitchen`, `admin` | Sets `scheduled_at` timestamp; surplus transitions to `pickup_pending`. |
| `requested` | `picked_up` | `receiver`, `admin` | Sets `picked_up_at`; links `proof_image_path`; computes and inserts `impact_records`. |
| `scheduled` | `picked_up` | `receiver`, `admin` | Sets `picked_up_at`; links `proof_image_path`; computes and inserts `impact_records`. |
| `requested` | `cancelled` | `kitchen`, `receiver`, `admin` | Records cancellation reason in notes; terminates transaction. |
| `scheduled` | `cancelled` | `kitchen`, `receiver`, `admin` | Aborts scheduled handover; terminates transaction. |
| `picked_up` | *Any* | **None** | **Strictly Forbidden (409 Conflict)**; state is locked and auditable. |
| `cancelled` | *Any* | **None** | **Strictly Forbidden (409 Conflict)**; aborted transaction cannot be revived. |

---

## 7. Realtime Synchronization & Fallback Polling Loop

```mermaid
sequenceDiagram
    autonumber
    actor User as Dashboard User
    participant Hook as useRealtimeSync Hook
    participant SupaRT as Supabase Realtime Channel
    participant SupaAPI as Next.js API Routes

    User->>Hook: Mount Page (e.g. /kitchen or /receiver)
    Hook->>Hook: Set status = 'connecting'
    Hook->>SupaRT: channel('dashboard-sync').on('postgres_changes', '*').subscribe()
    
    alt WebSocket Connected Successfully
        SupaRT-->>Hook: Event: 'SUBSCRIBED'
        Hook->>Hook: Set status = 'connected' (Green Badge)
    else WebSocket Fails or Firewalled
        SupaRT-->>Hook: Event: 'CHANNEL_ERROR' or 'TIMED_OUT'
        Hook->>Hook: Set status = 'polling' (Amber Badge)
        Hook->>Hook: Initialize setInterval(pollingInterval = 20,000ms)
    end

    Note over Hook, SupaAPI: Normal Operation — Realtime Event Burst
    SupaRT-->>Hook: Postgres UPDATE on 'pickup_requests'
    SupaRT-->>Hook: Postgres INSERT on 'impact_records'
    Note over Hook: Debounce Timer Activated (400ms window)
    Hook->>Hook: Coalesce rapid events; reset timer
    Hook->>SupaAPI: Trigger single authoritative onUpdate() re-fetch
    SupaAPI-->>Hook: Return fresh datasets
    Hook-->>User: Re-render UI components with updated state

    Note over Hook, SupaAPI: Fallback Operation — Periodic Polling Loop
    loop Every 20 Seconds
        Hook->>SupaAPI: Fallback polling tick -> execute onUpdate()
        SupaAPI-->>Hook: Return latest data
        Hook-->>User: Refresh UI transparently
    end
```

---

*Diagrams generated and verified against active system schemas, route handlers, state machines, and component trees.*
