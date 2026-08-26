# Ascend v2 — Subscription & Paywall Removed: Deployment Notes

**Not deployed yet** — this is ready whenever you choose to deploy it, same as everything else recently. Nothing in this note assumes it's live.

## The real business model change this reflects
The app itself is now free to use once signed in — no paywall, no monthly fee. Revenue is intended to come entirely from the coach marketplace (Program purchases, paid groups) instead of a base app subscription.

## What was actually removed
- The entire paywall gate in `AuthGate` — signing in now goes straight into the app
- `PaywallScreen.tsx`, `lib/subscription.ts` — deleted, not just disabled
- The "Manage subscription" row in Profile
- Three Netlify Functions: `create-checkout-session.mjs`, `create-portal-session.mjs`, `stripe-webhook.mjs`
- The `stripe` package dependency, and its entry in `netlify.toml`'s bundler config

## What was deliberately left alone
The `subscription_status`/`trial_ends_at` columns and their protective trigger on `profiles` are **not** dropped from your database. Same reasoning as leaving the coach-application infrastructure in place after that was reversed: unused columns are harmless, and not touching them means nothing to rebuild if this direction is ever revisited. If you do want a true, full database cleanup later, that's a separate, deliberate step — not something to do casually, since it's a one-way operation.

## One real, non-urgent thing worth knowing
If you still have a live webhook configured in Stripe's dashboard pointing at `/.netlify/functions/stripe-webhook`, it'll start getting 404s once this deploys, since that function no longer exists. This causes no actual harm — Stripe just logs failed delivery attempts — but if you want to tidy up, you can delete that webhook destination directly in Stripe's dashboard whenever convenient. Not urgent, not required for anything to work correctly.

## Verified in this environment

- Full type-check and build succeed
- Confirmed the critical regression case: app completely unaffected with Supabase unconfigured
- Full 5-tab regression sweep plus the Profile screen specifically — zero errors, and confirmed no leftover "Manage subscription" text anywhere
- Searched the entire codebase for any remaining Stripe references after removal — found only three stale code comments (not functional code) referencing the old pattern, cleaned those up too

## Cannot verify from here
Since there's no live account to actually sign in with from this environment, the *end-to-end* experience of a real user signing in and landing straight in the app (no paywall at all) still needs your own real testing once deployed.
