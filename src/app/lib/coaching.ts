// Ascend v2 — coach verification gate. Submitting and checking applications,
// plus the admin review flow. coach_status and is_admin can only ever be
// changed server-side (see SUPABASE_COACH_VERIFICATION.sql) — nothing here
// writes to those columns directly from the client.

import { supabase, isSupabaseConfigured } from './supabase'

export type CoachStatus = 'none' | 'pending' | 'approved' | 'rejected'
export type CoachApplication = {
  id: string; user_id: string; full_name: string; bio: string;
  years_experience: number | null; specialties: string | null; certifications: string | null;
  status: CoachStatus; submitted_at: string; reviewed_at: string | null; reviewer_notes: string | null;
}

export async function getMyCoachStatus(): Promise<CoachStatus> {
  if (!supabase) return 'none'
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'none'
  const { data } = await supabase.from('profiles').select('coach_status').eq('id', user.id).maybeSingle()
  return (data?.coach_status as CoachStatus) ?? 'none'
}

export async function amIAdmin(): Promise<boolean> {
  if (!supabase) return false
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  return !!data?.is_admin
}

export async function getMyApplication(): Promise<CoachApplication | null> {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('coach_applications').select('*').eq('user_id', user.id).order('submitted_at', { ascending: false }).limit(1).maybeSingle()
  return data as CoachApplication | null
}

export async function submitCoachApplication(fields: {
  fullName: string; bio: string; yearsExperience?: number; specialties?: string; certifications?: string;
}): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You need to be signed in.' }
  const { error } = await supabase.from('coach_applications').insert({
    user_id: user.id, full_name: fields.fullName, bio: fields.bio,
    years_experience: fields.yearsExperience ?? null, specialties: fields.specialties || null,
    certifications: fields.certifications || null,
  })
  if (error) return { error: error.message }
  return {}
}

// ── Admin only — the server independently re-verifies is_admin on every call ──

export async function getPendingApplications(): Promise<CoachApplication[]> {
  if (!supabase) return []
  const { data } = await supabase.from('coach_applications').select('*').eq('status', 'pending').order('submitted_at', { ascending: true })
  return (data as CoachApplication[]) || []
}

export async function reviewApplication(applicationId: string, decision: 'approved' | 'rejected', notes?: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'You need to be signed in.' }
  try {
    const res = await fetch('/.netlify/functions/review-coach-application', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, decision, notes }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error || 'Could not submit the review.' }
    return {}
  } catch {
    return { error: "Couldn't reach the server — check your connection and try again." }
  }
}

export { isSupabaseConfigured }
