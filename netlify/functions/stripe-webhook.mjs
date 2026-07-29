// Netlify Function: Stripe webhook handler.
//
// This is the ONLY place subscription_status ever gets written — never from
// client-side code. Stripe calls this URL directly (not the browser), so
// there's no user session to verify; instead, the request is authenticated
// by checking Stripe's cryptographic signature on the raw body, proving the
// event genuinely came from Stripe and wasn't forged.
//
// Setup required:
//   1. Netlify env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (the last one already exists
//      from account deletion — reused here)
//   2. In Stripe Dashboard → Developers → Webhooks → Add endpoint, point it
//      at: https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook
//      Select these events: checkout.session.completed,
//      customer.subscription.updated, customer.subscription.deleted
//   3. Copy the "Signing secret" shown after creating the endpoint into
//      STRIPE_WEBHOOK_SECRET — this can only be done AFTER the endpoint
//      exists, since Stripe generates it when you create the endpoint.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('stripe-webhook: missing required environment variables');
    return new Response('Not configured', { status: 503 });
  }

  const stripe = new Stripe(secretKey);
  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  let event;
  try {
    // Verifies the signature against the RAW body — this must be the exact
    // unparsed request text, not JSON.parse()'d and re-stringified, or the
    // signature check fails even for genuine events.
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('stripe-webhook: signature verification failed:', err.message);
    return new Response('Invalid signature', { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id;
        if (!userId) break;
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await admin.from('profiles').update({
          stripe_customer_id: session.customer,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }).eq('id', userId);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;
        if (!userId) break;
        await admin.from('profiles').update({
          subscription_status: subscription.status,
          trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }).eq('id', userId);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;
        if (!userId) break;
        await admin.from('profiles').update({
          subscription_status: 'canceled',
        }).eq('id', userId);
        break;
      }
      default:
        // Other event types are ignored on purpose — only these three
        // actually change what a user's access should be.
        break;
    }
  } catch (err) {
    console.error(`stripe-webhook: failed handling ${event.type}:`, err.message);
    // Still return 200 below — see note.
  }

  // Always acknowledge receipt with 200, even if our own update failed above.
  // Returning an error here would make Stripe retry the same event
  // repeatedly, which doesn't fix a real bug in our handler — it just
  // resends the same webhook. A failure here should surface in Netlify's
  // function logs (via the console.error above), not as a Stripe retry loop.
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
