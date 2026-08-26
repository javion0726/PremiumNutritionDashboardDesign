// Netlify Function: approve or reject a coach application. Only callable by
// an account with is_admin = true, verified server-side — never trusted from
// the client. This is the one place coach_status actually gets set, since
// the database trigger blocks that column from being changed any other way.
//
// Required environment variables (all already set from earlier work):
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
  const { applicationId, decision, notes } = body;
  if (!applicationId || !['approved', 'rejected'].includes(decision)) {
    return json({ error: 'Missing or invalid applicationId/decision' }, 400);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('review-coach-application: missing required environment variables');
    return json({ error: 'Not configured on this deployment yet' }, 503);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: verifyError } = await callerClient.auth.getUser();
  if (verifyError || !user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Verify the caller is actually an admin — using the admin client so this
  // check is authoritative, not filtered by the caller's own RLS view.
  const { data: callerProfile, error: profileError } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('review-coach-application: profile lookup failed:', profileError.message);
    return json({ error: 'Could not verify admin status' }, 500);
  }
  if (!callerProfile?.is_admin) {
    return json({ error: 'Not authorized' }, 403);
  }

  const { data: application, error: appError } = await admin
    .from('coach_applications')
    .select('user_id')
    .eq('id', applicationId)
    .maybeSingle();

  if (appError) {
    console.error('review-coach-application: application lookup failed:', appError.message);
    return json({ error: 'Could not look up that application' }, 500);
  }
  if (!application) return json({ error: 'Application not found' }, 404);

  const { error: updateAppError } = await admin
    .from('coach_applications')
    .update({ status: decision, reviewed_at: new Date().toISOString(), reviewer_notes: notes || null })
    .eq('id', applicationId);
  if (updateAppError) {
    console.error('review-coach-application: application update failed:', updateAppError.message);
    return json({ error: 'Could not update the application' }, 500);
  }

  const { error: updateProfileError } = await admin
    .from('profiles')
    .update({ coach_status: decision })
    .eq('id', application.user_id);
  if (updateProfileError) {
    console.error('review-coach-application: profile update failed:', updateProfileError.message);
    return json({ error: 'Could not update the applicant\'s coach status' }, 500);
  }

  return json({ success: true }, 200);
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
