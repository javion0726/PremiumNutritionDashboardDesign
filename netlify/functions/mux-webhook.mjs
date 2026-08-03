// Netlify Function: receives Mux's webhook when an uploaded video finishes
// processing, and updates the corresponding program_chapters row. Verifies
// the webhook signature the same way the Stripe webhook does — never trusts
// an unverified request claiming to be from Mux.
//
// Required environment variables:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (existing)
//   MUX_TOKEN_ID, MUX_TOKEN_SECRET, MUX_WEBHOOK_SECRET (new)

import { createClient } from '@supabase/supabase-js';
import Mux from '@mux/mux-node';

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const muxTokenId = process.env.MUX_TOKEN_ID;
  const muxTokenSecret = process.env.MUX_TOKEN_SECRET;
  const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
  if (!supabaseUrl || !serviceRoleKey || !muxTokenId || !muxTokenSecret || !webhookSecret) {
    console.error('mux-webhook: missing required environment variables');
    return new Response('Not configured', { status: 503 });
  }

  const mux = new Mux({ tokenId: muxTokenId, tokenSecret: muxTokenSecret, webhookSecret });

  const rawBody = await request.text();
  let event;
  try {
    // unwrap() verifies the signature AND parses the event in one step —
    // must receive the raw, unparsed body, exactly like the Stripe webhook.
    event = mux.webhooks.unwrap(rawBody, request.headers);
  } catch (err) {
    console.error('mux-webhook: signature verification failed:', err.message);
    return new Response('Invalid signature', { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (event.type === 'video.asset.ready') {
      const chapterId = event.data.passthrough;
      const playbackId = event.data.playback_ids?.[0]?.id;
      if (chapterId && playbackId) {
        await admin.from('program_chapters').update({
          mux_asset_id: event.data.id,
          mux_playback_id: playbackId,
          video_status: 'ready',
        }).eq('id', chapterId);
      }
    } else if (event.type === 'video.asset.errored') {
      const chapterId = event.data.passthrough;
      if (chapterId) {
        await admin.from('program_chapters').update({ video_status: 'error' }).eq('id', chapterId);
      }
    }
    // Other event types (upload created, etc.) are intentionally ignored —
    // only the final ready/errored states matter for updating a chapter.
  } catch (err) {
    console.error('mux-webhook: failed handling', event.type, ':', err.message);
    // Still return 200 — same reasoning as the Stripe webhook: a transient
    // internal error shouldn't make Mux endlessly retry a webhook that will
    // fail the same way every time regardless.
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
