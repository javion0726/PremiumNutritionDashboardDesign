// Ascend v2 — coach-run groups.
// A coach creates a group, shares an invite code, posts workouts to it, and
// can see how each member's own logged results compare. Members join via
// the code, see posted workouts, and log their own results against them
// using the exact same set-logging shape as every other workout in the app.

import { supabase, isSupabaseConfigured } from './supabase'
import type { Exercise } from './plans'
import type { SetRow } from './store'

export type Group = { id: string; name: string; coach_user_id: string; invite_code: string | null; created_at: string }
export type GroupMember = { group_id: string; user_id: string; role: 'coach' | 'member'; joined_at: string }
export type GroupWorkout = { id: string; group_id: string; posted_by: string; title: string; exercises: Exercise[]; notes: string | null; posted_at: string }
export type GroupWorkoutResultEntry = { name: string; sets: SetRow[] }
export type GroupWorkoutLog = { id: string; group_workout_id: string; user_id: string; exercises: GroupWorkoutResultEntry[]; completed_at: string }

function generateInviteCode(): string {
  // Avoids visually ambiguous characters (0/O, 1/I/L) since this gets typed
  // in by hand.
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function createGroup(name: string): Promise<{ group?: Group; error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You need to be signed in to create a group.' }
  const invite_code = generateInviteCode()
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, coach_user_id: user.id, invite_code })
    .select()
    .single()
  if (error) return { error: error.message }
  return { group: data as Group }
}

export async function getMyCoachedGroups(): Promise<Group[]> {
  if (!supabase) return []
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('groups').select('*').eq('coach_user_id', user.id).order('created_at', { ascending: false })
  return (data as Group[]) || []
}

export async function getMyMemberGroups(): Promise<Group[]> {
  if (!supabase) return []
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', user.id)
  const groupIds = (memberships || []).map(m => m.group_id)
  if (!groupIds.length) return []
  const { data } = await supabase.from('groups').select('*').in('id', groupIds).order('created_at', { ascending: false })
  return (data as Group[]) || []
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  if (!supabase) return []
  const { data } = await supabase.from('group_members').select('*').eq('group_id', groupId)
  return (data as GroupMember[]) || []
}

export async function joinGroupByCode(inviteCode: string): Promise<{ error?: string; groupName?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'You need to be signed in to join a group.' }
  try {
    const res = await fetch('/.netlify/functions/join-group', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error || 'Could not join that group.' }
    return { groupName: body.groupName }
  } catch {
    return { error: "Couldn't reach the server — check your connection and try again." }
  }
}

export async function postWorkoutToGroup(groupId: string, title: string, exercises: Exercise[], notes?: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You need to be signed in to post a workout.' }
  const { error } = await supabase.from('group_workouts').insert({
    group_id: groupId, posted_by: user.id, title, exercises, notes: notes || null,
  })
  if (error) return { error: error.message }
  return {}
}

export async function getGroupWorkouts(groupId: string): Promise<GroupWorkout[]> {
  if (!supabase) return []
  const { data } = await supabase.from('group_workouts').select('*').eq('group_id', groupId).order('posted_at', { ascending: false })
  return (data as GroupWorkout[]) || []
}

export async function logGroupWorkoutResult(groupWorkoutId: string, exercises: GroupWorkoutResultEntry[]): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You need to be signed in to log a result.' }
  const { error } = await supabase.from('group_workout_logs').upsert({
    group_workout_id: groupWorkoutId, user_id: user.id, exercises, completed_at: new Date().toISOString(),
  }, { onConflict: 'group_workout_id,user_id' })
  if (error) return { error: error.message }
  return {}
}

// For the coach: every member's result for one posted workout.
export async function getGroupWorkoutResults(groupWorkoutId: string): Promise<GroupWorkoutLog[]> {
  if (!supabase) return []
  const { data } = await supabase.from('group_workout_logs').select('*').eq('group_workout_id', groupWorkoutId)
  return (data as GroupWorkoutLog[]) || []
}

// My own result for one posted workout (a member checking whether they've
// already logged it).
export async function getMyResultForWorkout(groupWorkoutId: string): Promise<GroupWorkoutLog | null> {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('group_workout_logs').select('*').eq('group_workout_id', groupWorkoutId).eq('user_id', user.id).maybeSingle()
  return data as GroupWorkoutLog | null
}

export async function updateGroupWorkout(workoutId: string, title: string, exercises: Exercise[], notes?: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { error } = await supabase.from('group_workouts').update({ title, exercises, notes: notes || null }).eq('id', workoutId)
  if (error) return { error: error.message }
  return {}
}

export async function deleteGroupWorkout(workoutId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { error } = await supabase.from('group_workouts').delete().eq('id', workoutId)
  if (error) return { error: error.message }
  return {}
}

export async function leaveGroup(groupId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You need to be signed in.' }
  const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id)
  if (error) return { error: error.message }
  return {}
}

// True live updates, not polling — a member watching their group screen
// sees a newly-posted workout appear within a second or two, no need to
// leave and come back. Realtime respects the same RLS policies as every
// other read in this app (confirmed against current Supabase docs before
// building this): a subscriber only ever receives events for rows they
// could already SELECT, so this introduces no new access than what already
// exists. Requires SUPABASE_REALTIME_GROUPS.sql to have been run once.

export function subscribeToGroupWorkouts(groupId: string, onChange: () => void): () => void {
  if (!supabase) return () => {}
  const channel = supabase
    .channel(`group-workouts-${groupId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'group_workouts', filter: `group_id=eq.${groupId}` }, onChange)
    .subscribe((status, err) => {
      // Previously silent either way — now logs so a connection problem is
      // visible (in the browser console) instead of just quietly not updating.
      if (status === 'SUBSCRIBED') console.log('[realtime] connected: group_workouts for', groupId)
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error('[realtime] group_workouts subscription failed:', status, err)
    })
  return () => { supabase!.removeChannel(channel) }
}

export function subscribeToGroupWorkoutResults(groupWorkoutId: string, onChange: () => void): () => void {
  if (!supabase) return () => {}
  const channel = supabase
    .channel(`group-workout-results-${groupWorkoutId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'group_workout_logs', filter: `group_workout_id=eq.${groupWorkoutId}` }, onChange)
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') console.log('[realtime] connected: group_workout_logs for', groupWorkoutId)
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error('[realtime] group_workout_logs subscription failed:', status, err)
    })
  return () => { supabase!.removeChannel(channel) }
}

export { isSupabaseConfigured }
