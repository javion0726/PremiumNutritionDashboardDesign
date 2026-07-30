// Netlify Function: join a coach's group using an invite code.
//
// Why this has to be a server-side function: group_members' RLS policy only
// allows a group's coach to insert membership rows (see
// SUPABASE_SCHEMA.sql) — a member can't add themselves via a normal client
// insert. That's intentional; without it, anyone could add themselves to
// any group by guessing a group_id. This function is the one narrow,
// server-verified exception: it checks a real invite code first, and only
// then uses the service role key (which bypasses RLS) to actually add the
// member — the same "verify identity, then act with elevated privilege"
// pattern already used in delete-account.mjs and create-checkout-session.mjs.
//
// Required environment variables — all already set from earlier work:
//   SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Missing access token' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  const inviteCode = (body.inviteCode || '').trim().toUpperCase();
  if (!inviteCode) return json({ error: 'Enter an invite code' }, 400);

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('join-group: missing required environment variables');
    return json({ error: 'Groups are not configured on this deployment yet' }, 503);
  }

  // Step 1: verify who's actually asking.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: verifyError } = await callerClient.auth.getUser();
  if (verifyError || !user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Step 2: look up the group by invite code. Using the admin client here is
  // required — RLS on `groups` only lets you see groups you already belong
  // to or coach, which is exactly the chicken-and-egg problem this code path
  // exists to solve.
  const { data: group, error: groupError } = await admin
    .from('groups')
    .select('id, name, coach_user_id')
    .eq('invite_code', inviteCode)
    .maybeSingle();

  if (groupError) {
    console.error('join-group: lookup failed:', groupError.message);
    return json({ error: 'Could not look up that invite code' }, 500);
  }
  if (!group) {
    return json({ error: 'No group found for that invite code' }, 404);
  }
  if (group.coach_user_id === user.id) {
    return json({ error: "You're the coach of this group, not a member" }, 400);
  }

  // Step 3: add the membership row. Duplicate joins (already a member) are
  // treated as a harmless success, not an error the user needs to see.
  const { error: joinError } = await admin
    .from('group_members')
    .upsert({ group_id: group.id, user_id: user.id, role: 'member' }, { onConflict: 'group_id,user_id' });

  if (joinError) {
    console.error('join-group: insert failed:', joinError.message);
    return json({ error: 'Could not join that group — please try again' }, 500);
  }

  return json({ success: true, groupId: group.id, groupName: group.name }, 200);
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
