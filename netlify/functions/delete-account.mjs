// Netlify Function: delete a user's account (and all their data) for real.
//
// Why this has to be a server-side function: deleting a Supabase Auth user
// requires the "service role" key, which has full admin privileges over the
// project. That key must NEVER ship in client-side JS — unlike the anon key
// (which is safe to expose because RLS restricts what it can do), the
// service role key bypasses RLS entirely. It lives only in this function's
// environment, never in VITE_-prefixed variables (those get bundled into the
// browser build).
//
// Setup required: Site configuration → Environment variables →
//   SUPABASE_URL              (same value as VITE_SUPABASE_URL, just without
//                               the VITE_ prefix so it isn't bundled client-side)
//   SUPABASE_SERVICE_ROLE_KEY (Project Settings → API → service_role key —
//                               keep this secret, treat it like a password)
//
// How deletion actually works: every table in SUPABASE_SCHEMA.sql references
// auth.users(id) with "on delete cascade" — so deleting the auth user via the
// admin API automatically deletes every row of their data across every table
// too. This function does not need to (and does not) touch each table itself.
//
// Security: this does NOT trust a user_id sent from the client. It verifies
// the caller's own access token first (proving who they actually are), and
// only ever deletes that verified identity — never an arbitrary id someone
// could pass in.

import { createClient } from '@supabase/supabase-js';

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return json({ error: 'Missing access token' }, 401);
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY; // safe to reuse; it's the public key
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    console.error('delete-account: missing SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY');
    return json({ error: 'Account deletion is not configured on this deployment' }, 503);
  }

  // Step 1: verify who's actually asking, using their own token — never trust
  // a client-supplied user id for something this destructive.
  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: verifyError } = await callerClient.auth.getUser();
  if (verifyError || !user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  // Step 2: only now use the privileged admin client, and only to delete
  // exactly the identity just verified above.
  const adminClient = createClient(url, serviceRoleKey);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('delete-account: admin.deleteUser failed:', deleteError.message);
    return json({ error: 'Could not delete account — please try again' }, 500);
  }

  return json({ success: true }, 200);
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
