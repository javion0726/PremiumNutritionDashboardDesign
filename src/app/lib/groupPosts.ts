// Ascend v2 — per-group Community: posts, questions, and photos scoped to
// one group's own members.

import { supabase, isSupabaseConfigured } from './supabase'

export type GroupPost = {
  id: string; group_id: string; user_id: string;
  content: string | null; image_url: string | null; created_at: string;
}

export async function getGroupPosts(groupId: string): Promise<GroupPost[]> {
  if (!supabase) return []
  const { data } = await supabase.from('group_posts').select('*').eq('group_id', groupId).order('created_at', { ascending: false })
  return (data as GroupPost[]) || []
}

export async function createGroupPost(groupId: string, content: string, imageFile?: File): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You need to be signed in.' }

  let imageUrl: string | null = null
  if (imageFile) {
    const ext = imageFile.name.split('.').pop() || 'jpg'
    const path = `${groupId}/${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('group-post-images').upload(path, imageFile)
    if (uploadError) return { error: uploadError.message }
    const { data: publicUrlData } = supabase.storage.from('group-post-images').getPublicUrl(path)
    imageUrl = publicUrlData.publicUrl
  }

  const { error } = await supabase.from('group_posts').insert({
    group_id: groupId, user_id: user.id, content: content || null, image_url: imageUrl,
  })
  if (error) return { error: error.message }
  return {}
}

export async function deleteGroupPost(postId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { error } = await supabase.from('group_posts').delete().eq('id', postId)
  if (error) return { error: error.message }
  return {}
}

// Live updates — same reasoning as the workout-posting realtime feature:
// new posts appear on their own while someone's looking at the tab, no
// need to leave and come back.
export function subscribeToGroupPosts(groupId: string, onChange: () => void): () => void {
  if (!supabase) return () => {}
  const channel = supabase
    .channel(`group-posts-${groupId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'group_posts', filter: `group_id=eq.${groupId}` }, onChange)
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error('[realtime] group_posts subscription failed:', status, err)
    })
  return () => { supabase!.removeChannel(channel) }
}

export { isSupabaseConfigured }
