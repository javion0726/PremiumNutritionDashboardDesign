# Ascend v2 — Stripe Subscription Billing: Deployment Notes

## What this is
Subscription model: $4.99/month, 30-day free trial, **card required at signup**
(the trial doesn't charge anything for 30 days, but Stripe collects and
validates the card immediately — this is the "card required upfront, higher
conversion" model, not a card-optional trial).

## Setup, in order

1. **Run `SUPABASE_BILLING_SCHEMA.sql`** in your Supabase SQL Editor — adds
   the billing columns to `profiles` and the trigger that stops anyone but
   the server from writing to them. (Run this in addition to
   `SUPABASE_SCHEMA.sql`, which should already be applied from before.)

2. **You already have**, from earlier setup:
   - A Stripe account (test mode)
   - The `$4.99/month` product created, Price ID: `price_1TydsO1UqzMpGsEmR9MGVlqZ`
   - Test mode publishable key (not actually used server-side, only the secret key is)

3. **Add these environment variables in Netlify** (Site configuration → Environment variables):
   - `STRIPE_SECRET_KEY` — Test mode secret key (`sk_test_...`) from Stripe Dashboard → Developers → API keys. **Never share this in chat or commit it anywhere.**
   - `STRIPE_PRICE_ID` — `price_1TydsO1UqzMpGsEmR9MGVlqZ`
   - `SUPABASE_URL` — should already exist from the account-deletion setup (same value as `VITE_SUPABASE_URL`, no prefix)
   - `SUPABASE_SERVICE_ROLE_KEY` — should already exist from the account-deletion setup

4. **Deploy the code first** (so the webhook endpoint actually exists at a real URL), then:

5. **Create the webhook endpoint in Stripe** (this has to happen after deploying, not before, because Stripe needs a real URL to send events to):
   - Stripe Dashboard → Developers → Webhooks → **Add endpoint**
   - Endpoint URL: `https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook`
   - Select these events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - After creating it, Stripe shows a **Signing secret** (starts with `whsec_...`) — copy this

6. **Add one more environment variable in Netlify**:
   - `STRIPE_WEBHOOK_SECRET` — the `whsec_...` value from step 5

7. **Trigger a new deploy** in Netlify (Deploys → Trigger deploy) so all the env vars actually take effect.

## Testing — do this in Test mode before ever touching Live mode

Stripe gives you fake card numbers that simulate real payment flows with zero real money:
- `4242 4242 4242 4242` — a card that always succeeds. Any future expiry date, any 3-digit CVC, any ZIP.
- `4000 0000 0000 0341` — a card that gets attached successfully but fails when actually charged (useful for testing what happens when the trial ends and the charge fails)

**Test the full loop once, end to end**: sign up for a new account → get sent to the paywall (should say "Start your free trial") → click through Stripe Checkout with the test card → get redirected back → confirm the app now lets you in → check Supabase's `profiles` table for that user and confirm `subscription_status` says `trialing` and `trial_ends_at` is ~30 days out.

Then check **Manage subscription** from the Profile screen opens Stripe's real portal page.

## What I could not verify from my end
I have no way to reach Stripe's API or a real Supabase project from my sandbox, so none of this has been tested against a live payment flow — only type-checked, built successfully, and had its core access-control logic (`hasActiveAccess`, the paywall's new-vs-returning-user messaging, and the Unix-timestamp-to-date conversion for the trial end date) verified directly. The end-to-end test above is the real proof this works — please actually run it once before considering this done.

## Security note worth remembering
`subscription_status` and the other billing fields on `profiles` can only ever be changed by the Stripe webhook (using the service role key), never by the browser — this is enforced by a Postgres trigger, not just app-level logic. If you ever add a new billing-related field to `profiles`, remember to add it to that trigger's protected-columns list too, or it won't be protected.
