# FoodQueue — Open Items, Unverified Claims & Evidence Checklist

This document details all technical boundaries, unverified cloud integrations, known runtime considerations, and academic identity fields required before submitting the final academic report and presenting the project.

---

## 1. Unverified Technical & Integration Claims

During our systematic repository audit, all local business logic, TypeScript interfaces, and unit tests passed with 100% success (173 passing tests). However, because this audit was executed in a local isolated development environment without live production third-party service connections, the following items remain classified as **`NOT VERIFIED (Live)`**:

### 1.1 Live Multimodal Gemini API Requests
- **Code Status**: Fully implemented in [`lib/ai/gemini.ts`](file:///lib/ai/gemini.ts) and [`app/api/ai/classify-food/route.ts`](file:///app/api/ai/classify-food/route.ts).
- **Limitation**: The code contains a defensive fallback: if `GEMINI_API_KEY` is not provisioned or equals `'mock-gemini-key'`, the system returns a deterministic advisory baseline (`category: 'edible_surplus'`, `confidence: 0.85`).
- **Evidence Still Needed**: A recorded HTTP transaction against Google Generative AI servers (`gemini-2.5-flash`) demonstrating actual multimodal vision parsing with real latency metrics.

### 1.2 Multi-Client Realtime WebSocket Push Delivery
- **Code Status**: Fully implemented in [`lib/realtime/use-realtime-sync.ts`](file:///lib/realtime/use-realtime-sync.ts) and [`components/shared/realtime-status-badge.tsx`](file:///components/shared/realtime-status-badge.tsx). Unit tests pass (`tests/realtime-notifications.test.ts`).
- **Limitation**: Realtime WebSocket delivery requires active Supabase Cloud configuration (`alter publication supabase_realtime add table ...`). In local/offline conditions, the application falls back gracefully to 20-second polling.
- **Evidence Still Needed**: A dual-browser session demonstrating instantaneous cross-tab UI update without manual refresh when a pickup status changes in another window.

### 1.3 Live Cloud Supabase Storage Signed URLs
- **Code Status**: Implemented with 5MB file size limits and MIME filtering (JPEG/PNG/WebP). Signed URLs are generated with 3600-second expiration.
- **Limitation**: Verified via mocks and unit tests; not yet smoke-tested against a live production AWS S3 / Supabase Storage cluster with real network round-trips.

---

## 2. Known Operational Issues & Diagnoses

### 2.1 The "http://localhost:3000 Not Opening" Issue
- **Audit Finding**: During previous development phases, the user reported that `http://localhost:3000` failed to open in their browser.
- **Diagnosis**: We performed a network socket inspection using PowerShell (`Get-NetTCPConnection -LocalPort 3000`). No process was listening on port 3000. When we executed `npm run dev`, Next.js 16.4.0 (Turbopack) booted cleanly in **1,106 ms**, and `GET /api/health` returned `200 OK` (`{"data":{"status":"ok"},"error":null}`).
- **Root Cause**: The development server was simply not active when the user attempted to load the page. The application codebase itself is healthy and starts cleanly.
- **Resolution Step**: Run `npm run dev` in PowerShell and verify that `Ready in 1100ms` appears before opening the browser.

### 2.2 Vector Map Rendering in Headless / Restricted Browsers
- **Audit Finding**: In environments lacking hardware WebGL acceleration, MapLibre GL JS can throw a rendering warning.
- **Mitigation**: [`components/shared/map-view.tsx`](file:///components/shared/map-view.tsx) includes a defensive `try/catch` and fallback UI that renders a styled coordinates badge if WebGL fails or tile fetching is blocked.

### 2.3 Documentation Version Drift in README.md
- **Audit Finding**: The root [`README.md`](file:///README.md) stated: *"Current Status: Phase 2A — Kitchen Intelligence Specification"*, even though the repository contains complete implementations of Phases 3, 4, 5, 6, 7, 8, and 9!
- **Root Cause**: The README was written during early development and was never updated to reflect the completed smart matching, pickup workflows, analytics engine, receiver experience, and realtime features.
- **Recommendation**: This Master Source Pack supercedes the outdated README.

---

## 3. Academic Identity Placeholders (To Be Supplied by User)

The following academic project metadata cannot be invented by an AI assistant and must be filled in by the student team before printing the final project report or finalizing the PPT title slide:

| Item | Description | Placeholder in Template | Team Entry |
| :--- | :--- | :--- | :--- |
| **Institution Name** | College / University Name & Campus | `[INSERT COLLEGE / UNIVERSITY NAME]` | |
| **Department** | Academic Department (e.g. CSE, IT, AI&DS) | `[INSERT ACADEMIC DEPARTMENT]` | |
| **Course / Lab Name** | Subject Code & Title (e.g. Product Development Lab) | `[INSERT COURSE / LAB TITLE]` | |
| **Project Title** | Official submission title | `FoodQueue: AI Food Waste Intelligence & Redistribution Platform` | |
| **Academic Guide** | Faculty Mentor / Project Guide Name & Designation | `[INSERT GUIDE NAME & DESIGNATION]` | |
| **Head of Department** | HOD Name & Department | `[INSERT HOD NAME]` | |
| **Student Name(s)** | Full Names of Team Members | `[INSERT STUDENT NAMES]` | |
| **Register / Roll No(s)** | Official University Registration Numbers | `[INSERT REGISTRATION NUMBERS]` | |
| **Academic Year / Semester**| Academic Year (e.g., 2025–2026, Semester VI) | `[INSERT ACADEMIC YEAR & SEMESTER]` | |
| **Submission Date** | Official Date of Report Submission / Viva | `[INSERT SUBMISSION DATE]` | |

---

## 4. Evidence Capture Checklist for Defense Day

Before presenting to the academic examination panel, capture and prepare the following physical screenshots from the running local application (`npm run dev`):

- [ ] **Screenshot 1: Landing Page & Portal Overview** (`/`) showing the hero interface, value proposition, and role navigation.
- [ ] **Screenshot 2: Kitchen Meal Planning & Demand Forecast** (`/kitchen/meals/new`) displaying predicted consumers, portion ratio, recommended quantity, and confidence tier badge (`HIGH`).
- [ ] **Screenshot 3: Meal Consumption Audit & Leftover Invariant** (`/kitchen/meals/[id]`) showing recorded consumption numbers and the surplus handoff modal button.
- [ ] **Screenshot 4: AI Surplus Classification Modal** (`/kitchen/surplus`) showing the uploaded food photo, Gemini category classification (`edible_surplus`), visual condition remarks, and the advisory legal disclaimer badge.
- [ ] **Screenshot 5: Real-Time Food Rescue Clock** showing the countdown timer in `ACTIVE` (green) or `URGENT` (amber $\le 60$ min) state.
- [ ] **Screenshot 6: Ranked Receiver Opportunity Cards & Map** (`/kitchen/surplus/[id]`) showing the MapLibre map with origin kitchen pin, candidate receiver pins, and 0–100 match scores with explainable factor breakdowns.
- [ ] **Screenshot 7: Receiver Opportunity Acceptance** (`/receiver/opportunities`) showing candidate matches and the "Accept Match" action.
- [ ] **Screenshot 8: Pickup Handover Proof Upload** (`/receiver/pickups` or `/kitchen/pickups`) showing the file upload interface and completed handover badge.
- [ ] **Screenshot 9: Kitchen & Receiver Impact Dashboards** (`/kitchen/analytics` and `/receiver/impact`) showing cumulative food saved (kg), meals saved (0.4 kg/meal), CO₂e avoided, and INR economic value saved.
- [ ] **Screenshot 10: Admin Verification Panel** (`/admin/receivers`) demonstrating the toggle switch used to verify receivers before they appear in matching queries.
- [ ] **Terminal Evidence: Test Suite Execution** terminal screenshot showing `173 pass` with zero failures across 16 test files.

---

## 5. Technical Environment Prerequisites

To run this application locally during viva or demonstration:

1. **Node.js**: Version 18.18+ or 20+ (tested successfully on v24.16.0).
2. **npm**: Version 10+ (tested on v11.13.0).
3. **Supabase Account**: Free-tier cloud project or local Supabase CLI.
4. **Environment File (`.env.local`)**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   SUPABASE_SECRET_KEY=your-service-role-key
   GEMINI_API_KEY=your-gemini-api-key
   NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty
   ```
5. **Database Initialization**: Apply `supabase/migrations/0001_initial_schema.sql` and `supabase/seed.sql`.
6. **Storage Provisioning**: Ensure private buckets `food-images` and `pickup-proofs` are created.

---

*Checklist verified by Antigravity Technical Auditor. Keep this document as an operational guide for final project packaging.*
