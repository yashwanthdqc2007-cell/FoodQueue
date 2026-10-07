# FoodQueue — AI Food Waste Intelligence & Redistribution Platform

A web-based platform for institutional kitchens and food-processing units that reduces food waste through demand forecasting, AI-assisted surplus detection, recovery decision routing, and deterministic redistribution matching with nearby verified receivers.

---

## Current Status: Phase 0B — Application Foundation

The repository foundation has been initialized with the locked technology stack (Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui tokens, Supabase SSR/Admin integration, and Zod environment validation). No product or dashboard features have been implemented in this phase.

---

## Prerequisites

- **Node.js**: v18.18.0+ or v20+ (tested on v24.16.0)
- **Package Manager**: npm v10+ (tested on v11.13.0)
- **Supabase**: PostgreSQL project with migration `supabase/migrations/0001_initial_schema.sql` applied

---

## Environment Variables

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local` or expose server secrets to the browser.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_MAP_STYLE_URL=
```

- **Client / Browser Safe**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MAP_STYLE_URL`
- **Server Only (Isolated)**: `SUPABASE_SECRET_KEY` (admin operations), `GEMINI_API_KEY` (AI services)

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Code Quality & Verification Scripts

Run the quality checks to verify the build and type safety:

- **Typecheck**: `npm run typecheck` (`tsc --noEmit`)
- **Lint**: `npm run lint` (`next lint`)
- **Production Build**: `npm run build` (`next build`)
- **Production Run**: `npm start` (`next start`)

---

## Health Check Endpoint

An unauthenticated health endpoint is available at `GET /api/health`:
```json
{
  "data": {
    "status": "ok"
  },
  "error": null
}
```

---

## Project Documentation

- **[Master Architecture](ARCHITECTURE.md)**: System architecture, product flows, core user roles, baseline models, and technology stack.
- **[Project Structure & Blueprint](PROJECT_STRUCTURE.md)**: Next.js App Router organization, component hierarchy, directory tree, and pre-implementation checklist.
- **[Database Rules & Security Contract](DATABASE_RULES.md)**: PostgreSQL schema specification, enums, Row Level Security (RLS) policies, storage rules, and deterministic business logic.
- **[API Specification](API_SPEC.md)**: REST API contract, Zod request schemas, standard `{ data, error }` response envelopes, and role-based permissions.
- **[Supabase Setup Guide](docs/SUPABASE_SETUP.md)**: Manual project configuration, storage bucket provisioning, authentication settings, and environment variables.
