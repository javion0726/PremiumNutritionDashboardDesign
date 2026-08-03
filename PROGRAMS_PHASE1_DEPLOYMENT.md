# Ascend v2 — Coach Programs Phase 1 (Video Upload Pipeline): Deployment Notes

## What this phase is
Schema + upload pipeline foundation for coach Programs — multi-chapter, video-based paid content. A coach can create a program, add chapters, and upload video for each chapter via Mux.

**This phase is NOT purchase-protected yet.** Video playback policy is `public` (Mux's simplest option) specifically so this phase is testable end-to-end without needing the purchase flow built first. Real purchase verification + Mux `signed` playback policy is the next agreed phase — do not treat anything uploaded in this phase as access-controlled.

## Setup, in order

1. **Run `SUPABASE_PROGRAMS_SCHEMA.sql`** in your Supabase SQL Editor.
2. **Add three new environment variables in Netlify**:
   - `MUX_TOKEN_ID` — from Mux Dashboard → Settings → API Access Tokens (the one you created with just "Mux Video" permission)
   - `MUX_TOKEN_SECRET` — from the same token, shown only once when created
   - `MUX_WEBHOOK_SECRET` — you'll get this in step 4 below, after deploying
3. **Deploy the code first** (same reasoning as the Stripe webhook before — the webhook endpoint needs a real URL to exist before Mux can be configured to send events to it).
4. **Create the webhook in Mux**:
   - Mux Dashboard → Settings → Webhooks → Add new webhook
   - URL: `https://YOUR-SITE.netlify.app/.netlify/functions/mux-webhook`
   - Mux will show you a **signing secret** — copy it
5. **Add `MUX_WEBHOOK_SECRET`** to Netlify with that value, then trigger a new deploy so it takes effect.

## A real bug already fixed proactively, not discovered the hard way this time
The `stripe` package needed `external_node_modules` in `netlify.toml` to avoid a "Cannot find package" runtime error, discovered and fixed earlier in this project. `@mux/mux-node` has the same kind of package structure, so it's been added to that same list from the start — this should avoid hitting the identical bug again.

## Verified in this environment

- Full type-check and build succeed
- Confirmed the critical regression case: app completely unaffected with Supabase unconfigured
- **Found and fixed a real, confirmed layout bug during testing**: the three header buttons (Programs/Groups/Plans) genuinely clipped off-screen on a 390px viewport — caught via an actual screenshot, not assumed. Fixed by tightening padding and font size; re-verified with a fresh screenshot showing all three fit cleanly.
- Confirmed the create-program flow works and fails gracefully when Supabase isn't configured, same pattern as every other cloud feature
- Full 5-tab regression sweep — zero errors

## Cannot verify from here — genuinely needs your real testing

- An actual video upload end to end: create a program, add a chapter, upload a real video file, confirm the Mux webhook fires and the chapter flips to "Video ready"
- That the video actually plays back correctly

## What's deliberately NOT built yet (by design, next phase)
- No purchase flow — Stripe Checkout for one-time Program purchases isn't wired up
- No gated/signed video playback — currently `public` policy, watchable by anyone with the URL
- No viewer-facing UI to browse and buy programs from Discover yet — this phase is coach-side creation only
