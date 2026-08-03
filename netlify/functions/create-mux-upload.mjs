// Netlify Function: generates a direct-upload URL for a coach to upload a
// chapter's video straight to Mux from their browser — the actual video
// file never passes through Netlify at all, avoiding real payload-size and
// timeout limits a large video file would hit.
//
// SCOPE NOTE (see SUPABASE_PROGRAMS_SCHEMA.sql for the fuller version of
// this): playback_policy is 'public' in this phase — the upload pipeline
// foundation — not yet gated by purchase. That's the next phase.
//
// Required environment variables:
//   SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (existing)
//   MUX_TOKEN_ID, MUX_TOKEN_SECRET (new — from Mux Dashboard > Settings > API Access Tokens)

import { createClient } from '@supabase/supabase-js';
import Mux from '@mux/mux-node';

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
  const chapterId = body.chapterId;
  if (!chapterId) return json({ error: 'Missing chapter id' }, 400);

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const muxTokenId = process.env.MUX_TOKEN_ID;
  const muxTokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !muxTokenId || !muxTokenSecret) {
    console.error('create-mux-upload: missing required environment variables');
    return json({ error: 'Video uploads are not configured on this deployment yet' }, 503);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: verifyError } = await callerClient.auth.getUser();
  if (verifyError || !user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Verify this caller actually owns the program this chapter belongs to —
  // using the admin client deliberately here, so this check is authoritative
  // and not dependent on the caller's own RLS-filtered view.
  const { data: chapter, error: chapterError } = await admin
    .from('program_chapters')
    .select('id, program_id, programs!inner(coach_user_id)')
    .eq('id', chapterId)
    .maybeSingle();

  if (chapterError) {
    console.error('create-mux-upload: chapter lookup failed:', chapterError.message);
    return json({ error: 'Could not look up that chapter' }, 500);
  }
  if (!chapter || chapter.programs.coach_user_id !== user.id) {
    return json({ error: "That chapter doesn't exist or isn't yours" }, 404);
  }

  const mux = new Mux({ tokenId: muxTokenId, tokenSecret: muxTokenSecret });

  try {
    const upload = await mux.video.uploads.create({
      cors_origin: '*',
      new_asset_settings: {
        playback_policy: ['public'],
        passthrough: chapterId,
      },
    });

    await admin.from('program_chapters').update({ mux_upload_id: upload.id }).eq('id', chapterId);

    return json({ uploadUrl: upload.url }, 200);
  } catch (err) {
    console.error('create-mux-upload: Mux error:', err.message);
    return json({ error: 'Could not start the upload — please try again' }, 500);
  }
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
