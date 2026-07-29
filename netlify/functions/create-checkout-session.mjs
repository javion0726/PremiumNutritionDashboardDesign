// Netlify Function: start checkout for the Ascend Premium subscription.
//
// This creates a Stripe Checkout Session (a hosted Stripe page) with a
// 30-day free trial attached, then returns the URL for the client to
// redirect to. The client never talks to Stripe directly for this — it
// asks this function, which holds the Stripe secret key server-side only.
//
// Setup required (Netlify env vars):
//   STRIPE_SECRET_KEY   — Test mode secret key to start (sk_test_...)
//   STRIPE_PRICE_ID     — the Price ID from your Stripe product (price_...)
//   SUPABASE_URL, VITE_SUPABASE_ANON_KEY — already set up for auth verification

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!secretKey || !priceId || !url || !anonKey) {
    console.error('create-checkout-session: missing required environment variables');
    return json({ error: 'Subscriptions are not configured on this deployment' }, 503);
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Missing access token' }, 401);

  // Verify who's actually asking, using their own token — never trust a
  // client-supplied user id or email for something that creates a real
  // payment relationship.
  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: verifyError } = await callerClient.auth.getUser();
  if (verifyError || !user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  const stripe = new Stripe(secretKey);
  const { origin } = new URL(request.url);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 30,
        metadata: { supabase_user_id: user.id },
      },
      // Card is collected now (required upfront), even though the trial
      // means nothing is charged until it ends — this is the "card required,
      // auto-charges after trial" model, not a card-optional trial.
      payment_method_collection: 'always',
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });
    return json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session failed:', err.message);
    return json({ error: 'Could not start checkout — please try again' }, 500);
  }
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
