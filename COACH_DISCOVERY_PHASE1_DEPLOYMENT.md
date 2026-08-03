# Ascend v2 — Coach Marketplace Phase 1: Deployment Notes

## Setup

1. **Run `SUPABASE_COACH_DISCOVERY.sql`** in your Supabase SQL Editor (in addition to everything already applied: main schema, billing, groups, groups RLS fix, leave-group, edit-workout, realtime, realtime-delete-fix).
2. **No new environment variables** — the new `join-public-group.mjs` function reuses the same `SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` already set up.
3. Deploy as usual.

## What's actually built

- **Coach profiles** — a real, separate table from `profiles` (which holds sensitive billing data) specifically so nothing sensitive is ever at risk of being exposed by a public-read policy. Only display name + bio, publicly readable by design.
- **Public/private toggle** — settable when creating a group, or afterward from an existing group's screen. Toggling public for the first time prompts for a coach profile if one doesn't exist yet.
- **Discover** — search public groups by name, see the coach's display name and a real member count (via a function that returns only a number, never the actual member list — `group_members` itself stays exactly as private as before).
- **Joining a public group directly** (no invite code) — goes through a new server-side function that verifies, on the server, that the group is genuinely marked public before adding anyone — the same "verify identity, then act with elevated privilege" pattern used everywhere else sensitive in this app. This is what stops someone from bypassing an invite-only group by guessing its id.

## Verified in this environment

- Full type-check and build succeed
- Confirmed the critical regression case: with Supabase unconfigured, the app is completely unaffected — same graceful fallback as every other cloud feature
- Confirmed Discover actually opens and shows the correct empty state
- Confirmed the public toggle in Create correctly reveals the coach-profile fields only when needed, hidden otherwise
- Full 5-tab regression sweep — zero errors

## Cannot verify from here — genuinely needs your real testing

- The full loop with two real accounts: make a group public, confirm it shows up for a *different* account browsing Discover, join it without a code, confirm membership actually registers
- That a **private** group genuinely does NOT show up in Discover for someone who isn't a member — this is the one security-relevant claim in this whole phase that's only proven once tested against a real database, not just reasoned about from the RLS policy text

## What this is NOT yet (by design — later phases)

- No Follow system (separate from Join) yet
- No ratings or reviews yet
- No multi-week custom Programs yet — coaches can still only post individual workouts, same as before

## Known limitation, honest expectation to set

A brand new coach's public group will show real, low numbers — "0 members," no reviews (reviews aren't even built yet) — not the impressive-looking example numbers from any mockup. That's correct, not a bug: this shows what's real, not invented social proof.
