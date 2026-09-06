# Personal Book Journey

Responsive book logging app inspired by the supplied desktop and mobile references.

## Stack

- Next.js + React + TypeScript
- Open Library Search/Covers APIs (free book data)
- Supabase Auth + PostgreSQL (optional but recommended for accounts and cloud persistence)

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

If Supabase is configured, run `supabase/schema.sql` in the Supabase SQL editor and enable Email/Password auth. Without Supabase variables, the dashboard uses browser local storage for a quick UI/demo mode and the login screen explains that authentication is not configured.

## Book data

Search uses Open Library. Covers are loaded from its Covers API. The initial search is intentionally lightweight; richer work/edition detail can be added to a dedicated book details page next.
