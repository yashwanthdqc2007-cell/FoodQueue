# AI Food Waste Intelligence & Redistribution Platform

A web-based platform for institutional kitchens and food-processing units that reduces food waste through demand forecasting, AI-assisted surplus detection, recovery decision routing, and deterministic redistribution matching with nearby verified receivers.

---

## Project Documentation

The technical and architectural specifications for this project are organized across the following core documents:

- **[Master Architecture](ARCHITECTURE.md)**: System architecture, product flows, core user roles, baseline models, and technology stack.
- **[Project Structure & Blueprint](PROJECT_STRUCTURE.md)**: Next.js App Router organization, component hierarchy, modules, directory tree, and pre-implementation checklist.
- **[Database Rules & Security Contract](DATABASE_RULES.md)**: PostgreSQL schema specification, enums, Row Level Security (RLS) policies, storage rules, and deterministic business logic.
- **[API Specification](API_SPEC.md)**: REST API contract, Zod request schemas, standard `{ data, error }` response envelopes, and role-based permissions.
- **[Supabase Setup Guide](docs/SUPABASE_SETUP.md)**: Manual project configuration, storage bucket provisioning, authentication settings, and environment variables.
