// Ascend v2 — coach-run groups.
// A coach creates a group, shares an invite code, posts workouts to it, and
// can see how each member's own logged results compare. Members join via
// the code, see posted workouts, and log their own results against them
// using the exact same set-logging shape as every other workout in the app.

import { supabase, isSupabaseConfigured } from './supabase'
import type { Exercise, PlanDay } from './plans'
import type { SetRow } from './store'

export type Group = { id: string; name: string; coach_user_id: string; invite_code: string | null; is_public: boolean; created_at: string }
export type CoachProfile = { user_id: string; display_name: string; bio: string | null; avatar_url: string | null; banner_url: string | null; created_at: string; updated_at: string }
export type GroupMember = { group_id: string; user_id: string; role: 'coach' | 'moderator' | 'member'; joined_at: string }
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

export async function createGroup(name: string, isPublic = false): Promise<{ group?: Group; error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You need to be signed in to create a group.' }
  const invite_code = generateInviteCode()
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, coach_user_id: user.id, invite_code, is_public: isPublic })
    .select()
    .single()
  if (error) return { error: error.message }
  return { group: data as Group }
}

export async function joinPublicGroup(groupId: string): Promise<{ error?: string; groupName?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'You need to be signed in to join a group.' }
  try {
    const res = await fetch('/.netlify/functions/join-public-group', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error || 'Could not join that group.' }
    return { groupName: body.groupName }
  } catch {
    return { error: "Couldn't reach the server — check your connection and try again." }
  }
}

export async function setGroupPublic(groupId: string, isPublic: boolean): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { error } = await supabase.from('groups').update({ is_public: isPublic }).eq('id', groupId)
  if (error) return { error: error.message }
  return {}
}

export async function getMyCoachProfile(): Promise<CoachProfile | null> {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('coach_profiles').select('*').eq('user_id', user.id).maybeSingle()
  return data as CoachProfile | null
}

export async function getCoachProfile(userId: string): Promise<CoachProfile | null> {
  if (!supabase) return null
  const { data } = await supabase.from('coach_profiles').select('*').eq('user_id', userId).maybeSingle()
  return data as CoachProfile | null
}

export async function saveCoachProfile(displayName: string, bio: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You need to be signed in.' }
  const { error } = await supabase.from('coach_profiles').upsert({
    user_id: user.id, display_name: displayName, bio: bio || null, updated_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  return {}
}

// ─── coach profile images ───────────────────────────────────────────────────
// Stored in the public `coach-images` bucket under `<user_id>/…`, which is
// what the storage RLS policy keys off — a coach can only ever write into
// their own folder. Public-read is intentional: these show on public
// Discover cards and on members' Home screens.

export type CoachImageKind = 'avatar' | 'banner'

// Guard rails so a coach can't accidentally upload a 40MB RAW photo (or a
// non-image) as their banner and wedge their own profile.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function uploadCoachImage(kind: CoachImageKind, file: File): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You need to be signed in.' }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { error: 'Please choose a JPG, PNG, WEBP or GIF image.' }
  if (file.size > MAX_IMAGE_BYTES) return { error: 'That image is larger than 5MB — please choose a smaller one.' }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  // Timestamped filename rather than a fixed one: replacing an image gets a
  // new URL, so browsers and the service worker can't serve a stale cached
  // copy of the old picture.
  const path = `${user.id}/${kind}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage.from('coach-images').upload(path, file)
  if (uploadError) return { error: uploadError.message }

  const { data: publicUrlData } = supabase.storage.from('coach-images').getPublicUrl(path)
  const url = publicUrlData.publicUrl

  // Only this one column is written, so saving an avatar never disturbs the
  // banner (or the display name and bio).
  const column = kind === 'avatar' ? 'avatar_url' : 'banner_url'
  const { error } = await supabase.from('coach_profiles')
    .update({ [column]: url, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
  if (error) return { error: error.message }
  return { url }
}

export async function removeCoachImage(kind: CoachImageKind): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You need to be signed in.' }
  const column = kind === 'avatar' ? 'avatar_url' : 'banner_url'
  const { error } = await supabase.from('coach_profiles')
    .update({ [column]: null, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
  if (error) return { error: error.message }
  return {}
}

// ─── coach plans ────────────────────────────────────────────────────────────
// A coach plan is a multi-week plan a coach builds for their group. It is
// stored in the same shape as the app's built-in plans (a 7-slot Mon–Sun
// schedule), so once a member starts one, every existing workout screen —
// day view, set logging, rest timer, PR detection — works on it unchanged.

export type CoachPlan = {
  id: string
  group_id: string
  coach_user_id: string
  name: string
  description: string | null
  total_weeks: number
  schedule: PlanDay[]
  created_at: string
  updated_at: string
}

export async function getGroupCoachPlans(groupId: string): Promise<CoachPlan[]> {
  if (!supabase) return []
  const { data } = await supabase.from('coach_plans').select('*').eq('group_id', groupId).order('created_at', { ascending: false })
  return (data as CoachPlan[]) || []
}

export async function getCoachPlan(planId: string): Promise<CoachPlan | null> {
  if (!supabase) return null
  const { data } = await supabase.from('coach_plans').select('*').eq('id', planId).maybeSingle()
  return (data as CoachPlan) || null
}

export async function createCoachPlan(
  groupId: string, name: string, description: string, totalWeeks: number, schedule: PlanDay[],
): Promise<{ plan?: CoachPlan; error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You need to be signed in.' }
  const { data, error } = await supabase.from('coach_plans').insert({
    group_id: groupId, coach_user_id: user.id, name, description: description || null,
    total_weeks: totalWeeks, schedule,
  }).select().single()
  if (error) return { error: error.message }
  return { plan: data as CoachPlan }
}

export async function updateCoachPlan(
  planId: string, name: string, description: string, totalWeeks: number, schedule: PlanDay[],
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { error } = await supabase.from('coach_plans').update({
    name, description: description || null, total_weeks: totalWeeks, schedule,
    updated_at: new Date().toISOString(),
  }).eq('id', planId)
  if (error) return { error: error.message }
  return {}
}

export async function deleteCoachPlan(planId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { error } = await supabase.from('coach_plans').delete().eq('id', planId)
  if (error) return { error: error.message }
  return {}
}

export async function searchPublicGroups(query: string): Promise<Group[]> {
  if (!supabase) return []
  let q = supabase.from('groups').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(30)
  if (query.trim()) q = q.ilike('name', `%${query.trim()}%`)
  const { data } = await q
  return (data as Group[]) || []
}

export async function getPublicGroupMemberCount(groupId: string): Promise<number> {
  if (!supabase) return 0
  const { data } = await supabase.rpc('get_public_group_member_count', { target_group_id: groupId })
  return typeof data === 'number' ? data : 0
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

export async function setMemberRole(groupId: string, userId: string, role: 'moderator' | 'member'): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { error } = await supabase.from('group_members').update({ role }).eq('group_id', groupId).eq('user_id', userId)
  if (error) return { error: error.message }
  return {}
}

export async function removeMember(groupId: string, userId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
  if (error) return { error: error.message }
  return {}
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

export async function deleteGroup(groupId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { error } = await supabase.from('groups').delete().eq('id', groupId)
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

export function subscribeToGroupWorkouts(groupId: string, onChange: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE' }) => void): () => void {
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

// App-wide version of the above — not scoped to one specific group, so this
// can run for as long as the user is signed in, regardless of which screen
// they're on, and still only receives INSERT events for groups they're
// actually a coach or member of. This relies on the same RLS-respecting
// behavior confirmed above; it's the INSERT case specifically (not DELETE)
// so the standard RLS filtering applies with no extra replica identity setup
// needed here.
export function subscribeToAnyGroupWorkoutPosted(onNewWorkout: (workout: GroupWorkout) => void): () => void {
  if (!supabase) return () => {}
  const channel = supabase
    .channel('any-group-workout-posted')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_workouts' }, (payload) => {
      onNewWorkout(payload.new as GroupWorkout)
    })
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error('[realtime] app-wide group_workouts subscription failed:', status, err)
    })
  return () => { supabase!.removeChannel(channel) }
}

export { isSupabaseConfigured }
