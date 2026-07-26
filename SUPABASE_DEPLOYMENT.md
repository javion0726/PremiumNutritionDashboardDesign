# Ascend — Supabase Accounts & Sync: Deployment Notes

## Setup, in order

1. **Run `SUPABASE_SCHEMA.sql`** in your Supabase project's SQL Editor. This creates every table, enables RLS, and sets up the auto-create-profile-on-signup trigger.
2. **Enable email auth** in your Supabase project (Authentication → Providers → Email should already be on by default).
3. **Set environment variables:**
   - Local dev: copy `.env.example` to `.env`, fill in your project URL + anon key.
   - Netlify: Site configuration → Environment variables → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy. If either variable is missing, the app runs exactly as it did before this work — local-only, no login. Nothing breaks by leaving it unconfigured; this is deliberate.

## What was actually verified vs. what needs your eyes

**Verified for real, in this environment:**
- `tsc --noEmit` — zero errors, both with and without Supabase env vars set
- `vite build` — succeeds in both configurations
- Unconfigured build: confirmed in a real browser (Playwright) that onboarding shows directly, no auth screen, zero console errors — the critical regression check
- Configured build (fake project URL, since my environment can't reach real Supabase): confirmed the auth screen renders with working email/password fields, and a failed sign-in attempt against an unreachable project fails with a clean message instead of a crash or raw error text
- The pre-existing `syncCalculatorWeightGoal` type bug — found and fixed, unrelated to this work

**Cannot verify from here, genuinely needs your testing:**
- A real sign-up → email confirmation → sign-in flow against your actual Supabase project (my sandbox can't reach any real Supabase instance)
- The local-data adoption flow with real data — I've read the logic carefully and it matches the design in the schema/sync code, but "does it feel right when a real user with months of real workout history signs up for the first time" is something only real testing answers
- RLS policies actually blocking cross-user access — the SQL is written correctly per Supabase's documented patterns, but I'd recommend manually testing with two accounts once this is live: confirm account A genuinely cannot see account B's data
- The group/coach RLS policies specifically — these are more complex (subqueries checking group membership) and are currently unused by any UI, so they've never been exercised by a real query. Worth a manual check once you build the group feature, not just trusted as correct because the SQL parses.

## How the sync actually behaves

- Every existing `save()` call in `store.ts` still writes to `localStorage` instantly — nothing about current app speed or behavior changes.
- 1.5 seconds after any save, a full snapshot pushes to Supabase in the background. If that fails (offline, Supabase down, misconfigured), it fails silently and retries on the next save — local data is never at risk.
- On sign-in, existing remote data (if any) pulls down and overwrites local. If this is a brand-new account, local data pushes up once instead. This decision is made once per account (tracked in `migration_status`) and never repeats — signing in on a second device won't let that device's local data silently clobber your first device's real data.

## Known gap, flagged honestly

`clearAllData()` (the "Clear all data" button) uses `localStorage.removeItem()` directly and does **not** trigger the sync listener — so it only clears the local copy, not the cloud one. The UI now says this explicitly rather than leaving it implied. If you want a true "delete my cloud data too" option later, that's a real, separate feature (deleting rows across every table, or deleting the auth user entirely) — not something to bolt on silently.

## Pre-existing issue, unrelated to this work

`package.json` lists `react`/`react-dom` as *optional* peer dependencies, which is unusual for an application (peer deps are normally a library pattern). Plain `npm install` skips them entirely as a result — I had to patch this locally just to get a working build to test against. Your actual deploy uses `pnpm` (per `netlify.toml`), which likely resolves this differently and may not be affected — but if you ever see a build fail with "cannot resolve react/jsx-runtime," this is why.
