# REST API Specification & Contract

## 1. Overview & Standards

This document defines the complete REST API contract for the **AI Food Waste Intelligence & Redistribution Platform** (`food-rescue-ai`).

### Standard Response Envelope
All API endpoints return JSON conforming to the following consistent structure:

#### Success Response
```json
{
  "data": { ... },
  "error": null
}
```

#### Error Response
```json
{
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": null
  }
}
```

### Standard Error Codes
| HTTP Status | Error Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request payload failed Zod schema validation |
| 401 | `UNAUTHORIZED` | Missing, expired, or invalid session token |
| 403 | `FORBIDDEN` | Authenticated user lacks required role or organization ownership |
| 404 | `NOT_FOUND` | Target resource does not exist or user has no visibility |
| 409 | `CONFLICT` | State conflict (e.g., matching item already accepted, duplicate key) |
| 422 | `UNPROCESSABLE_ENTITY` | Business rule validation failed (e.g., surplus past deadline) |
| 500 | `INTERNAL_SERVER_ERROR` | Sanitized server or upstream error (no secrets/internals leaked) |

---

## 2. Authentication, Credentials & Key Architecture

### Credential Separation & Security Model
The platform strictly differentiates between client-side public credentials and trusted server-side secrets:
1. **Frontend Publishable Key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`):**
   - Exposed to browser client code alongside `NEXT_PUBLIC_SUPABASE_URL`.
   - Used for user authentication (login, signup, session management) and client-side queries strictly governed by PostgreSQL Row Level Security (RLS) policies.
   - Cannot bypass RLS and cannot update protected profile attributes (`role`, `organization_id`).
2. **Server-Only Secret Key (`SUPABASE_SECRET_KEY`):**
   - Elevated secret credential residing strictly within trusted server runtime environments (Next.js Route Handlers / Server Actions).
   - **NEVER** exposed to, bundled with, or accessible by the browser client.
   - Used exclusively on the server for privileged administrative operations after authenticating the calling user and verifying that their profile role is `admin`.
3. **Session Headers:**
   - Supabase Auth cookie-based sessions (passed automatically by browser) or `Authorization: Bearer <supabase_jwt_token>`.
   - Content-Type: `application/json` (except multipart file uploads handled directly via signed storage URLs).

---

## 3. Endpoints

---

### 3.1 Profile & Admin-Only User/Organization Provisioning

> [!IMPORTANT]
> **Admin-Only Security Model:** Normal users cannot choose or modify their own `role` or `organization_id`. All organization creation, role promotions, and user-to-organization assignments are strictly restricted to callers with verified `admin` role and executed via server-only trusted handlers.

#### `GET /api/profile`
- **Purpose:** Fetch current authenticated user's profile, role, organization details, and linked operational entity (kitchen or receiver).
- **Auth Requirement:** Authenticated user session.
- **Allowed Roles:** Any authenticated user (`kitchen`, `receiver`, `admin`).
- **Success Response (200 OK — Assigned User):**
  ```json
  {
    "data": {
      "id": "uuid",
      "fullName": "Chef Ramesh",
      "email": "ramesh@greenvalley.org",
      "phone": "+91-9876543210",
      "role": "kitchen",
      "organization": {
        "id": "uuid",
        "name": "Green Valley Kitchens",
        "type": "kitchen"
      },
      "kitchen": {
        "id": "uuid",
        "name": "Main Dining Kitchen",
        "active": true
      }
    },
    "error": null
  }
  ```
- **Success Response (200 OK — Newly Registered / Pending Assignment):**
  ```json
  {
    "data": {
      "id": "uuid",
      "fullName": "New Kitchen Staff",
      "email": "staff@example.org",
      "phone": null,
      "role": "kitchen",
      "organization": null,
      "kitchen": null,
      "receiver": null,
      "status": "pending_organization_assignment"
    },
    "error": null
  }
  ```

#### `POST /api/admin/organizations`
- **Purpose:** Create an operating organization and optionally provision its associated kitchen or receiver entity.
- **Auth Requirement:** Authenticated Supabase session.
- **Required Role:** `admin` ONLY (verified against `profiles.role = 'admin'`).
- **Execution:** Privileged server-side handler using server-only secret key.
- **Request Body (Zod Schema):**
  ```typescript
  z.object({
    name: z.string().min(2).max(100),
    organizationType: z.enum(['kitchen', 'receiver', 'institution', 'ngo', 'processing_unit']),
    address: z.string().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    contactPhone: z.string().optional(),
    // Optional entity creation payload:
    kitchen: z.object({
      name: z.string().min(2),
      timezone: z.string().default('Asia/Kolkata')
    }).optional(),
    receiver: z.object({
      receiverType: z.enum(['ngo', 'shelter', 'hostel', 'community_center', 'other']),
      maxCapacity: z.number().positive(),
      acceptedFoodTypes: z.array(z.string()).default([]),
      operatingHours: z.record(z.string()).default({})
    }).optional()
  })
  ```
- **Success Response (201 Created):**
  ```json
  {
    "data": {
      "organizationId": "uuid",
      "name": "Green Valley Kitchens",
      "organizationType": "kitchen",
      "entityId": "uuid"
    },
    "error": null
  }
  ```
- **Error Cases:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN` (caller is not admin).

#### `POST /api/admin/users/assign`
- **Purpose:** Assign a target user to an organization and configure their role.
- **Auth Requirement:** Authenticated Supabase session.
- **Required Role:** `admin` ONLY.
- **Security Verification Steps:**
  1. Authenticate caller session via Supabase Auth.
  2. Verify caller's profile role is `admin` (reject non-admins with `403 FORBIDDEN`).
  3. Verify target `userId` exists in `profiles`.
  4. Verify target `organizationId` exists in `organizations`.
  5. Perform privileged update on trusted server runtime using server secret key.
  6. Return sanitized updated user profile.
- **Request Body (Zod Schema):**
  ```typescript
  z.object({
    userId: z.string().uuid(),
    organizationId: z.string().uuid(),
    role: z.enum(['kitchen', 'receiver', 'admin'])
  })
  ```
- **Success Response (200 OK):**
  ```json
  {
    "data": {
      "userId": "uuid",
      "organizationId": "uuid",
      "role": "kitchen",
      "updatedAt": "2026-10-07T14:30:00Z"
    },
    "error": null
  }
  ```
- **Error Cases:**
  - `400 VALIDATION_ERROR` (invalid UUID format or invalid role enum)
  - `401 UNAUTHORIZED` (missing or invalid auth session)
  - `403 FORBIDDEN` (caller is not an admin)
  - `404 NOT_FOUND` (target user or target organization does not exist)

#### `GET /api/admin/users`
- **Purpose:** List registered users, their roles, organizations, and assignment status for administrator oversight.
- **Auth Requirement:** Authenticated Supabase session.
- **Required Role:** `admin` ONLY.
- **Query Params:** `role`, `organizationId`, `unassignedOnly` (boolean), `limit`, `offset`.
- **Success Response (200 OK):**
  ```json
  {
    "data": {
      "users": [
        {
          "id": "uuid",
          "fullName": "Chef Ramesh",
          "email": "ramesh@greenvalley.org",
          "role": "kitchen",
          "organizationId": "uuid",
          "organizationName": "Green Valley Kitchens",
          "createdAt": "2026-10-07T10:00:00Z"
        },
        {
          "id": "uuid",
          "fullName": "Pending Staff",
          "email": "staff@example.org",
          "role": "kitchen",
          "organizationId": null,
          "organizationName": null,
          "createdAt": "2026-10-07T11:00:00Z"
        }
      ],
      "total": 2
    },
    "error": null
  }
  ```
- **Error Cases:** `401 UNAUTHORIZED`, `403 FORBIDDEN`.

---

### 3.2 Meals & Consumption Tracking

#### `POST /api/meals`
- **Purpose:** Plan and record an upcoming meal service for a kitchen.
- **Auth Requirement:** Authenticated.
- **Required Role:** `kitchen`, `admin`.
- **Request Body (Zod Schema):**
  ```typescript
  z.object({
    kitchenId: z.string().uuid(),
    mealName: z.string().min(2).max(100),
    mealDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mealPeriod: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']),
    expectedConsumers: z.number().int().nonnegative(),
    plannedQuantity: z.number().positive(),
    unit: z.string().min(1).default('servings')
  })
  ```
- **Success Response (201 Created):**
  ```json
  {
    "data": {
      "id": "uuid",
      "kitchenId": "uuid",
      "mealName": "Lunch Service",
      "mealDate": "2026-10-08",
      "mealPeriod": "lunch",
      "expectedConsumers": 850,
      "plannedQuantity": 880,
      "unit": "servings",
      "createdAt": "2026-10-07T14:30:00Z"
    },
    "error": null
  }
  ```

#### `GET /api/meals`
- **Purpose:** List scheduled and past meals for the authenticated user's kitchen.
- **Query Params:** `kitchenId` (optional, defaults to user's kitchen), `startDate`, `endDate`, `limit`, `offset`.
- **Success Response (200 OK):**
  ```json
  {
    "data": {
      "meals": [
        {
          "id": "uuid",
          "mealName": "Lunch Service",
          "mealDate": "2026-10-07",
          "mealPeriod": "lunch",
          "expectedConsumers": 820,
          "plannedQuantity": 850,
          "unit": "servings",
          "hasConsumptionRecorded": true
        }
      ],
      "total": 1
    },
    "error": null
  }
  ```

#### `POST /api/consumption`
- **Purpose:** Record actual consumers, prepared food, and leftover quantities post-service.
- **Auth Requirement:** Authenticated.
- **Required Role:** `kitchen`, `admin`.
- **Request Body (Zod Schema):**
  ```typescript
  z.object({
    mealId: z.string().uuid(),
    actualConsumers: z.number().int().nonnegative(),
    preparedQuantity: z.number().nonnegative(),
    consumedQuantity: z.number().nonnegative(),
    leftoverQuantity: z.number().nonnegative()
  })
  ```
- **Success Response (201 Created):**
  ```json
  {
    "data": {
      "id": "uuid",
      "mealId": "uuid",
      "actualConsumers": 790,
      "preparedQuantity": 850,
      "consumedQuantity": 805,
      "leftoverQuantity": 45,
      "recordedAt": "2026-10-07T14:45:00Z"
    },
    "error": null
  }
  ```

---

### 3.3 Demand Predictions

#### `POST /api/predictions/demand`
- **Purpose:** Generate a baseline demand forecast for a specified meal date and period.
- **Auth Requirement:** Authenticated.
- **Required Role:** `kitchen`, `admin`.
- **Request Body (Zod Schema):**
  ```typescript
  z.object({
    kitchenId: z.string().uuid(),
    predictionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mealPeriod: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other'])
  })
  ```
- **Success Response (200 OK):**
  ```json
  {
    "data": {
      "id": "uuid",
      "kitchenId": "uuid",
      "predictionDate": "2026-10-08",
      "mealPeriod": "lunch",
      "predictedConsumers": 810,
      "recommendedQuantity": 830,
      "predictedSurplus": 20,
      "confidence": 0.85,
      "modelVersion": "mvp-baseline-v1"
    },
    "error": null
  }
  ```

---

### 3.4 AI Classification

#### `POST /api/ai/classify-food`
- **Purpose:** Send an image path or base64 image data plus optional notes to Gemini to get advisory category classification and quality insights.
- **Auth Requirement:** Authenticated.
- **Required Role:** `kitchen`, `admin`.
- **Request Body (Zod Schema):**
  ```typescript
  z.object({
    imagePath: z.string().min(1),
    notes: z.string().max(500).optional()
  })
  ```
- **Success Response (200 OK):**
  ```json
  {
    "data": {
      "foodType": "Steamed Basmati Rice",
      "suggestedCategory": "edible_surplus",
      "visibleCondition": "Intact grains, hot steam visible, no discoloration",
      "confidence": 0.94,
      "advisoryNotes": "Appears well preserved. Confirm safe temperature before donation."
    },
    "error": null
  }
  ```

---

### 3.5 Surplus Reporting & Management

#### `POST /api/surplus`
- **Purpose:** Log a new surplus food batch with its quantity, preparation time, deadline, and classification.
- **Auth Requirement:** Authenticated.
- **Required Role:** `kitchen`, `admin`.
- **Request Body (Zod Schema):**
  ```typescript
  z.object({
    kitchenId: z.string().uuid(),
    sourceMealId: z.string().uuid().optional().nullable(),
    foodName: z.string().min(2).max(100),
    quantity: z.number().positive(),
    unit: z.string().min(1).default('kg'),
    preparedAt: z.string().datetime().optional(),
    redistributionDeadline: z.string().datetime(),
    category: z.enum(['edible_surplus', 'reusable', 'organic', 'unsafe', 'unknown']).default('edible_surplus'),
    aiConfidence: z.number().min(0).max(1).optional().nullable(),
    imagePath: z.string().optional().nullable(),
    notes: z.string().max(1000).optional().nullable()
  })
  ```
- **Success Response (201 Created):**
  ```json
  {
    "data": {
      "id": "uuid",
      "foodName": "Steamed Basmati Rice",
      "quantity": 25.0,
      "unit": "kg",
      "status": "active",
      "category": "edible_surplus",
      "redistributionDeadline": "2026-10-07T18:00:00Z",
      "createdAt": "2026-10-07T14:30:00Z"
    },
    "error": null
  }
  ```

#### `GET /api/surplus`
- **Purpose:** List surplus items. Filtered by kitchen for kitchen users, or matching opportunities for receivers.
- **Query Params:** `status`, `category`, `kitchenId`, `limit`, `offset`.

#### `PATCH /api/surplus/:id`
- **Purpose:** Update status or details of a surplus item (e.g. transition to `expired`, `recovered`, or `disposed`).
- **Request Body (Zod Schema):**
  ```typescript
  z.object({
    status: z.enum(['active', 'matched', 'pickup_pending', 'picked_up', 'expired', 'recovered', 'disposed']).optional(),
    category: z.enum(['edible_surplus', 'reusable', 'organic', 'unsafe', 'unknown']).optional(),
    notes: z.string().max(1000).optional()
  })
  ```

---

### 3.6 Redistribution Matching

#### `POST /api/matching/generate`
- **Purpose:** Run the deterministic matching engine for an active surplus item and insert/update `redistribution_matches`.
- **Auth Requirement:** Authenticated.
- **Required Role:** `kitchen`, `admin`.
- **Request Body (Zod Schema):**
  ```typescript
  z.object({
    surplusId: z.string().uuid()
  })
  ```
- **Success Response (200 OK):**
  ```json
  {
    "data": {
      "surplusId": "uuid",
      "matchesCount": 3,
      "matches": [
        {
          "id": "uuid",
          "receiverId": "uuid",
          "receiverName": "Hope Community Centre",
          "matchScore": 92.5,
          "matchReason": [
            "Within 3.2 km distance",
            "Sufficient receiver capacity",
            "Compatible food type (cooked_rice)"
          ],
          "status": "recommended"
        }
      ]
    },
    "error": null
  }
  ```

#### `POST /api/matching/:matchId/accept`
- **Purpose:** Receiver accepts a matched surplus recommendation, triggering a `pickup_request` creation and updating surplus status to `matched`.
- **Auth Requirement:** Authenticated.
- **Required Role:** `receiver`, `admin`.
- **Success Response (200 OK):**
  ```json
  {
    "data": {
      "matchId": "uuid",
      "status": "accepted",
      "pickupRequestId": "uuid"
    },
    "error": null
  }
  ```

#### `POST /api/matching/:matchId/reject`
- **Purpose:** Receiver declines a match recommendation.
- **Auth Requirement:** Authenticated.
- **Required Role:** `receiver`, `admin`.

---

### 3.7 Pickups & Impact

#### `POST /api/pickups`
- **Purpose:** Schedule or create a direct pickup request for an accepted surplus match.
- **Request Body (Zod Schema):**
  ```typescript
  z.object({
    surplusId: z.string().uuid(),
    receiverId: z.string().uuid(),
    scheduledAt: z.string().datetime().optional(),
    notes: z.string().max(500).optional()
  })
  ```

#### `PATCH /api/pickups/:id`
- **Purpose:** Update pickup state (`scheduled`, `picked_up`, `cancelled`) and attach handover proof photo.
- **Request Body (Zod Schema):**
  ```typescript
  z.object({
    status: z.enum(['scheduled', 'picked_up', 'cancelled']),
    scheduledAt: z.string().datetime().optional(),
    proofImagePath: z.string().optional(),
    notes: z.string().max(500).optional()
  })
  ```
- **Side Effects on `picked_up`:** Automatically transitions `surplus_items.status` to `picked_up` and inserts a calculated `impact_records` row.

---

### 3.8 Analytics & Notifications

#### `GET /api/analytics/kitchen`
- **Purpose:** Retrieve aggregate waste diversion, meals saved, prediction accuracy, and active trends for the kitchen.
- **Query Params:** `period` (`7d`, `30d`, `90d`, `all`).

#### `GET /api/analytics/admin`
- **Purpose:** Retrieve system-wide metrics (total kilograms saved, total CO2e diverted, active organizations, receiver performance).
- **Required Role:** `admin`.

#### `POST /api/notifications/read`
- **Purpose:** Mark one or all notifications as read for the authenticated user.
- **Request Body (Zod Schema):**
  ```typescript
  z.object({
    notificationIds: z.array(z.string().uuid()).optional(),
    markAll: z.boolean().optional()
  })
  ```
