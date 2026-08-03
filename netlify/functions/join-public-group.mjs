// Netlify Function: join a group directly from Discover (no invite code
// needed) — but only if the group is actually marked public. Same reasoning
// as join-group.mjs: group_members' RLS policy only lets a coach add
// members, so a member joining themselves needs this narrow, server-verified
// exception. The check here is what makes it safe: this only ever succeeds
// for a group that is genuinely public, verified server-side, not trusted
// from the client — someone can't bypass an invite-only group by guessing
// its id and calling this instead.

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
  const groupId = body.groupId;
  if (!groupId) return json({ error: 'Missing group id' }, 400);

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('join-public-group: missing required environment variables');
    return json({ error: 'Groups are not configured on this deployment yet' }, 503);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: verifyError } = await callerClient.auth.getUser();
  if (verifyError || !user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: group, error: groupError } = await admin
    .from('groups')
    .select('id, name, coach_user_id, is_public')
    .eq('id', groupId)
    .maybeSingle();

  if (groupError) {
    console.error('join-public-group: lookup failed:', groupError.message);
    return json({ error: 'Could not look up that group' }, 500);
  }
  if (!group || !group.is_public) {
    // Deliberately the same generic message whether the group doesn't exist
    // or simply isn't public — doesn't confirm to a caller which private
    // group ids are real.
    return json({ error: 'That group is not available to join' }, 404);
  }
  if (group.coach_user_id === user.id) {
    return json({ error: "You're the coach of this group, not a member" }, 400);
  }

  const { error: joinError } = await admin
    .from('group_members')
    .upsert({ group_id: group.id, user_id: user.id, role: 'member' }, { onConflict: 'group_id,user_id' });

  if (joinError) {
    console.error('join-public-group: insert failed:', joinError.message);
    return json({ error: 'Could not join that group — please try again' }, 500);
  }

  return json({ success: true, groupName: group.name }, 200);
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
