# Ascend v2 — Coach Verification Revert + Per-Group Community: Deployment Notes

## Two separate changes in this update

### 1. Coach verification removed
Creating a group or a Program no longer requires an approved application — reverted back to open creation, same as before verification existed. Run `SUPABASE_REVERT_COACH_VERIFICATION.sql`.

The `coach_applications` table, `coach_status`/`is_admin` columns, and their protective trigger are all left in place, unused — nothing was deleted. If this is wanted again later, re-enabling it doesn't require rebuilding from scratch, just restoring the two RLS policies this migration replaced.

### 2. Per-group Community tab (posts, questions, photos)
Not a global feed — this is scoped to one group's own members, reachable via a **Community** button on both the coach's and a member's view of a group. Run `SUPABASE_GROUP_COMMUNITY.sql`.

## Setup

1. Run both SQL files in Supabase's SQL Editor (order doesn't matter between them).
2. No new environment variables needed.
3. Deploy as usual.

## A real security tradeoff, stated plainly, not glossed over
The `group-post-images` storage bucket is **public** — meaning anyone who obtained the exact image URL could view it without being a group member, since public buckets bypass Storage's access control for reads entirely. What *is* enforced with real RLS: only an actual member or the coach of a group can upload into that group's folder, and the URL is only ever surfaced through `group_posts` rows, which real access control does gate correctly. This is a common, accepted tradeoff for this kind of content (the same model many consumer apps use for shared image links) — not a claim that these photos are cryptographically private. Worth knowing, not something to be surprised by later.

## What's real and reused, not new risk
The Community feature's access control reuses the exact `is_group_member`/`is_group_coach` functions already built and proven safe during the earlier RLS recursion fix — no new circular-policy risk introduced here.

## Verified in this environment

- Full type-check and build succeed
- Confirmed the critical regression case: app completely unaffected with Supabase unconfigured
- Confirmed "Create a group" and "Create a program" both go directly to their real forms again — no gate gets in the way
- Full 5-tab regression sweep — zero errors

## Cannot verify from here — needs your real testing
- Actually posting text and a photo in a group's Community tab, confirming it appears for other members in real time (same live-update pattern already proven for workouts)
- Confirming a non-member genuinely cannot see a group's posts even if signed in
