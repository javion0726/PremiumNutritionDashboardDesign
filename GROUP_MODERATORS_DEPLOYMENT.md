# Ascend v2 — Community Moderators: Deployment Notes

## What this is
A coach can promote a member to moderator from the group's **Manage members** screen. Moderators can delete inappropriate posts and remove disruptive regular members — but deliberately **cannot** remove the coach or other moderators, so a moderator can't be used to take over someone else's group.

## Setup

1. Run `SUPABASE_GROUP_MODERATORS.sql` in Supabase's SQL Editor (in addition to `SUPABASE_GROUP_COMMUNITY.sql`, which should already be applied).
2. No new environment variables.
3. Deploy as usual.

## What's real about the permission boundary
This isn't just a UI convention — it's enforced in the database itself. The "moderator removes regular members" policy explicitly checks the role of the row being deleted, not just who's asking: a moderator's delete request only succeeds if the target is a plain `member`, never a `coach` or another `moderator`. Someone editing network requests directly couldn't bypass this — the database itself refuses the operation.

## A known, honest limitation
Members are shown by a truncated user ID ("Member a1b2c3d4"), same as everywhere else in this app — there's still no "display name visible to other members" concept built anywhere, so this stays consistent with that existing gap rather than inventing a name for just this one screen.

## Verified in this environment

- Full type-check and build succeed
- Confirmed the critical regression case: app completely unaffected with Supabase unconfigured
- Full 5-tab regression sweep — zero errors

## Cannot verify from here — needs your real testing
- Promoting a real member to moderator, confirming they can then delete another member's post but genuinely cannot remove the coach or another moderator
- Confirming a demoted moderator immediately loses those abilities
