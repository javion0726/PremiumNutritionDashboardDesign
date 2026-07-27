// Ascend — authentication
// Thin wrapper over Supabase Auth (email + password to start). Exposes a
// useAuth() hook so components can react to sign-in/sign-out the same way
// useAppData() already reacts to local data changes.

import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabase'

export type AuthState = {
  user: User | null
  session: Session | null
  loading: boolean   // true until the initial session check resolves
}

const NETWORK_ERROR_MESSAGE = "Couldn't reach the server — check your connection and try again."

// Supabase's client catches network-level failures itself and returns them
// as a normal `{ error }` result (message: "Failed to fetch") rather than
// throwing — so this checks the message content, not a try/catch.
function cleanAuthError(message: string): string {
  if (/failed to fetch|network|load failed/i.test(message)) return NETWORK_ERROR_MESSAGE
  return message
}

export async function signUp(email: string, password: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  try {
    const { error } = await supabase.auth.signUp({ email, password })
    return error ? { error: cleanAuthError(error.message) } : {}
  } catch {
    return { error: NETWORK_ERROR_MESSAGE }
  }
}

export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? { error: cleanAuthError(error.message) } : {}
  } catch {
    return { error: NETWORK_ERROR_MESSAGE }
  }
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  try { await supabase.auth.signOut() } catch { /* local state clears regardless via onAuthStateChange */ }
}

export async function requestPasswordReset(email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return error ? { error: cleanAuthError(error.message) } : {}
  } catch {
    return { error: NETWORK_ERROR_MESSAGE }
  }
}

// Permanently deletes the signed-in user's account AND all their cloud data
// (every table cascades from auth.users via "on delete cascade" in the
// schema). This calls a server-side Netlify Function because deleting an
// auth user requires the service role key, which must never reach the
// browser — the anon key the client normally uses cannot do this.
export async function deleteAccount(): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud accounts are not configured on this deployment yet.' }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'You need to be signed in to delete your account.' }
  try {
    const res = await fetch('/.netlify/functions/delete-account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error || 'Could not delete your account — please try again.' }
    // The account is gone server-side; clear the now-invalid local session too.
    await supabase.auth.signOut()
    return {}
  } catch {
    return { error: NETWORK_ERROR_MESSAGE }
  }
}

// React hook: current auth state, updates live on sign-in/sign-out/token refresh.
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, session: null, loading: true })

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setState({ user: null, session: null, loading: false })
      return
    }
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setState({ user: data.session?.user ?? null, session: data.session, loading: false })
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session, loading: false })
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  return state
}
