# Supabase Setup — Food Waste Platform

## 1. Create the project

Create a new Supabase project for the Food Waste Intelligence & Redistribution Platform.

For the MVP, use a development project first. Do not put production secrets into GitHub.

## 2. Apply the schema

Open **SQL Editor** in Supabase and run:

`supabase/migrations/0001_initial_schema.sql`

This creates:

- PostgreSQL enums
- Organizations
- Profiles
- Kitchens
- Meals
- Consumption records
- Demand predictions
- Surplus items
- Waste records
- Receivers
- Redistribution matches
- Pickup requests
- Impact records
- Notifications
- Indexes
- RLS policies
- Auth helper functions
- New-user profile trigger

Supabase recommends enabling RLS for tables exposed through its API and defining policies explicitly; this migration does that for every application table. See the official RLS guidance: https://supabase.com/docs/guides/database/postgres/row-level-security

## 3. Add development seed data

After the schema succeeds, optionally run:

`supabase/seed.sql`

The seed records are for development/demo use only.

## 4. Create Storage buckets

Create two **private** buckets in Supabase Storage:

- `food-images`
- `pickup-proofs`

Use Storage policies rather than making these buckets public. Supabase Storage integrates access control with Postgres RLS. See: https://supabase.com/docs/guides/storage/security/access-control

Recommended initial file limits:

- Food images: 5 MB
- Pickup proofs: 5 MB

Recommended types:

- image/jpeg
- image/png
- image/webp

## 5. Auth configuration

Enable the authentication provider you plan to use for the MVP. Email/password is enough for the first version.

During application signup, pass:

```json
{
  "full_name": "User name"
}
```

The database trigger automatically creates the initial profile with `role = 'kitchen'` and `organization_id = NULL`. Newly registered users cannot assign themselves an organization or role. An administrator must provision and link the user via the admin user management interface.

## 6. Environment variables

Create `.env.local` in the Next.js app:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_MAP_STYLE_URL=
```

- **Client / Browser:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_MAP_STYLE_URL` are accessible in browser client code. Database interactions via the publishable key are strictly governed by Postgres Row Level Security (RLS) and the user's authenticated session.
- **Trusted Server Only:** `SUPABASE_SECRET_KEY` (used for privileged administrative actions) and `GEMINI_API_KEY` (used for AI classification) reside strictly on the server runtime. **Never** expose `SUPABASE_SECRET_KEY` or `GEMINI_API_KEY` to browser or client-side code.

## 7. Important implementation rule

The frontend must never assume that hiding a button is enough for authorization.

Authorization must be enforced through Supabase RLS and server-side checks.

## 8. Next development step

After the database migration succeeds, initialize the Next.js application and connect Supabase before building dashboard UI.
