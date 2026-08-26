# Ascend v2 — Coach Verification Gate: Deployment Notes

## What this is
Creating a group (any group — free or paid) or publishing a Program now requires an approved coach application. Free participation as a member — joining groups, browsing, buying — stays completely open. This only gates the ability to act as a coach at all, which was a deliberate decision driven by real fraud/trust concerns, not a default assumption.

## Setup

1. **Run `SUPABASE_COACH_VERIFICATION.sql`** in your Supabase SQL Editor.
2. **No new environment variables** — the new `review-coach-application.mjs` function reuses the same Supabase credentials already set up.
3. Deploy as usual.

## Critical bootstrap step — you have to do this manually, once
Nobody is an admin by default, including you — there's no signup path to become the first admin, on purpose (that would be a real security hole). To make your own account able to review applications:

1. Supabase Dashboard → **Table Editor** → **profiles**
2. Find your own row (search by your email if needed, or check **Authentication** first to find your user id)
3. Edit the `is_admin` column for your row directly, set it to **true**
4. Save

After that, reload the app and open **Profile** — you should now see an **Admin → Review coach applications** section that no one else can see.

## What's actually built

- **Application form**: name, fitness background, years of experience, specialties, certifications (optional) — trimmed down from a much longer list, since most of the extra fields (social media links, testimonials) add friction without much real signal at this stage
- **A real security pattern, not a UI-only gate**: `coach_status` and `is_admin` can only ever be changed by the server, via a database trigger — the exact same protection already used for subscription billing status. A user editing their own profile through the normal app flow cannot set these themselves, even by inspecting network requests.
- **Approval only gates creation**, not existing content — if a coach's status were ever revisited, groups/programs they already made stay manageable, only *new* ones would be blocked

## Verified in this environment

- Full type-check and build succeed
- Confirmed the critical regression case: app completely unaffected with Supabase unconfigured
- Confirmed the gate actually intercepts both "Create a group" and "Create a program" — neither reaches the real creation form without approval
- Confirmed the application form submits (and fails gracefully when Supabase isn't configured, same pattern as everywhere else)
- Confirmed the admin section is genuinely invisible to a non-admin account
- Full 5-tab regression sweep — zero errors

## Cannot verify from here — needs your real testing
- The actual end-to-end loop: submit a real application with a second test account, approve it from your admin account, confirm that account can now create a group/program
- That a **rejected** application correctly shows the rejection state and still blocks creation
