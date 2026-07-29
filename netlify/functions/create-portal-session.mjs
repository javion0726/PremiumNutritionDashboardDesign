// Netlify Function: open Stripe's hosted Customer Portal, where a user can
// update their card, view invoices, or cancel their subscription — Stripe
// builds and maintains this page, so it's not something to build ourselves.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!secretKey || !url || !anonKey) {
    return json({ error: 'Subscriptions are not configured on this deployment' }, 503);
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Missing access token' }, 401);

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: verifyError } = await callerClient.auth.getUser();
  if (verifyError || !user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  // Look up this user's Stripe customer id — need the service role client
  // for this since it's reading a field the anon-key client can still read
  // via RLS (own row), so either client actually works here; using the
  // caller's own token keeps this consistent with "the user can only ever
  // act on their own data."
  const { data: profile, error: profileError } = await callerClient
    .from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle();
  if (profileError || !profile?.stripe_customer_id) {
    return json({ error: 'No subscription found for this account yet' }, 404);
  }

  const stripe = new Stripe(secretKey);
  const { origin } = new URL(request.url);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/`,
    });
    return json({ url: session.url });
  } catch (err) {
    console.error('create-portal-session failed:', err.message);
    return json({ error: 'Could not open subscription management — please try again' }, 500);
  }
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
