# Ascend v2 — Coach Groups: Deployment Notes

## Setup

1. **Run `SUPABASE_GROUPS_SCHEMA.sql`** in your Supabase SQL Editor (in addition to the other schema files that should already be applied: `SUPABASE_SCHEMA.sql`, `SUPABASE_BILLING_SCHEMA.sql`).
2. **No new environment variables needed** — the one new server-side function (`join-group.mjs`) reuses the same `SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` variables already set up for account deletion and billing.
3. Deploy as usual.

## What's real here vs. what still needs your testing

**Verified in this environment:**
- Full type-check and build succeed
- Navigating into Groups, Create, and Join all render correctly with Supabase unconfigured — confirmed the graceful "not configured" error shows rather than a crash (same pattern as every other cloud-dependent feature in this app)
- Full regression sweep across all 5 tabs — no errors introduced

**Cannot verify from here, genuinely needs a real test with two accounts:**
- Create a group with one account (the coach), get the invite code, join it with a *second* account (a member) — confirm the member actually shows up in the coach's member count
- Post a workout as the coach, confirm the member sees it, complete it as the member, confirm the coach can see that specific result under **Results**
- This is the one feature in the app so far where one user can see another user's data (the coach seeing a member's logged results) — worth specifically confirming a coach genuinely cannot see anything from a member who ISN'T in one of their groups. The RLS policy is scoped narrowly (only results tied to a workout that specific coach posted), but a real cross-account test is the only way to be fully sure this is airtight in practice, not just on paper.

## Known limitations, not bugs

- **No way to remove a member from a group yet** — the schema and RLS support a coach deleting a `group_members` row, but there's no UI button for it yet. Real feature, just not built this pass.
- **No way to delete/edit a posted workout after posting** — same story, the RLS allows it (`coach can delete own posted workouts`), no UI wired up yet.
- **Member identifiers in the coach's results view are raw user IDs** (truncated), not names — the app doesn't currently have a "display name visible to other users" concept anywhere, so this is honest rather than showing something invented. Worth deciding later whether members should set a name visible to their coach specifically.
