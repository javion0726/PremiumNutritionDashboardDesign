// Ascend v2 — coach Programs (multi-chapter, video-based, paid content).
// Phase 1 scope: schema + upload pipeline. Purchase verification and
// gated (signed) playback are the next phase — see SUPABASE_PROGRAMS_SCHEMA.sql
// for the full reasoning.

import { supabase, isSupabaseConfigured } from './supabase'
import type { Exercise } from './plans'

export type Program = {
  id: string; coach_user_id: string; title: string; description: string | null;
  price_cents: number; status: 'draft' | 'published'; created_at: string; updated_at: string;
}
export type ProgramChapter = {
  id: string; program_id: string; title: string; order_index: number;
  mux_upload_id: string | null; mux_asset_id: string | null; mux_playback_id: string | null;
  video_status: 'pending' | 'ready' | 'error';
  linked_workout: Exercise[] | null; created_at: string;
}

export async function createProgram(title: string, description: string, priceCents: number): Promise<{ program?: Program; error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You need to be signed in to create a program.' }
  const { data, error } = await supabase
    .from('programs')
    .insert({ coach_user_id: user.id, title, description: description || null, price_cents: priceCents, status: 'draft' })
    .select()
    .single()
  if (error) return { error: error.message }
  return { program: data as Program }
}

export async function getMyPrograms(): Promise<Program[]> {
  if (!supabase) return []
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('programs').select('*').eq('coach_user_id', user.id).order('created_at', { ascending: false })
  return (data as Program[]) || []
}

export async function updateProgramStatus(programId: string, status: 'draft' | 'published'): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { error } = await supabase.from('programs').update({ status, updated_at: new Date().toISOString() }).eq('id', programId)
  if (error) return { error: error.message }
  return {}
}

export async function getChapters(programId: string): Promise<ProgramChapter[]> {
  if (!supabase) return []
  const { data } = await supabase.from('program_chapters').select('*').eq('program_id', programId).order('order_index', { ascending: true })
  return (data as ProgramChapter[]) || []
}

export async function createChapter(programId: string, title: string, orderIndex: number): Promise<{ chapter?: ProgramChapter; error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data, error } = await supabase
    .from('program_chapters')
    .insert({ program_id: programId, title, order_index: orderIndex })
    .select()
    .single()
  if (error) return { error: error.message }
  return { chapter: data as ProgramChapter }
}

export async function deleteChapter(chapterId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { error } = await supabase.from('program_chapters').delete().eq('id', chapterId)
  if (error) return { error: error.message }
  return {}
}

// Requests a direct-upload URL from Mux (via our own server, which verifies
// the caller actually owns this chapter first) — the actual video file then
// uploads straight from the browser to Mux, never through our own server.
export async function requestVideoUploadUrl(chapterId: string): Promise<{ uploadUrl?: string; error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'You need to be signed in.' }
  try {
    const res = await fetch('/.netlify/functions/create-mux-upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error || 'Could not start the upload.' }
    return { uploadUrl: body.uploadUrl }
  } catch {
    return { error: "Couldn't reach the server — check your connection and try again." }
  }
}

export { isSupabaseConfigured }
