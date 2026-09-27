// Ascend v2 — member profile pictures.
//
// Deliberately a separate, public table from `profiles`: that one is locked
// to its owner by RLS (it holds private data), so an avatar stored there
// would be invisible to everyone else — useless for a profile picture that
// exists to be seen by other members of a group.

import { supabase } from './supabase'

export type UserProfile = {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// Same guard rails as the coach images: no 40MB RAW files, no non-images.
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function getMyUserProfile(): Promise<UserProfile | null> {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle()
  return (data as UserProfile) || null
}

// Batch lookup — a community feed of 30 posts must not fire 30 requests.
// Returns a map keyed by user id so callers can render each post directly.
export async function getUserProfiles(userIds: string[]): Promise<Record<string, UserProfile>> {
  if (!supabase || !userIds.length) return {}
  const unique = Array.from(new Set(userIds))
  const { data } = await supabase.from('user_profiles').select('*').in('user_id', unique)
  const map: Record<string, UserProfile> = {}
  for (const row of (data as UserProfile[]) || []) map[row.user_id] = row
  return map
}

// Keeps the public display name in step with the name the person set in the
// app, so their posts show a name rather than just a picture. Called on
// avatar upload and whenever the profile screen loads with a name set.
export async function syncMyDisplayName(displayName: string): Promise<void> {
  if (!supabase) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('user_profiles').upsert({
    user_id: user.id,
    display_name: displayName.trim() || null,
    updated_at: new Date().toISOString(),
  })
}

export async function uploadMyAvatar(file: File): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You need to be signed in.' }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { error: 'Please choose a JPG, PNG, WEBP or GIF image.' }
  if (file.size > MAX_AVATAR_BYTES) return { error: 'That image is larger than 5MB — please choose a smaller one.' }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  // Timestamped name so replacing a picture produces a new URL — otherwise
  // browsers and the service worker can serve the old cached image.
  const path = `${user.id}/avatar-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage.from('user-avatars').upload(path, file)
  if (uploadError) return { error: uploadError.message }

  const { data: publicUrlData } = supabase.storage.from('user-avatars').getPublicUrl(path)
  const url = publicUrlData.publicUrl

  // upsert, not update: this may be the first time the row exists at all.
  const { error } = await supabase.from('user_profiles').upsert({
    user_id: user.id, avatar_url: url, updated_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  return { url }
}

export async function removeMyAvatar(): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You need to be signed in.' }
  const { error } = await supabase.from('user_profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
  if (error) return { error: error.message }
  return {}
}
