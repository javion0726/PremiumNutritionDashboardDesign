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
