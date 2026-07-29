// Ascend — subscription status & Stripe checkout/portal redirects
//
// subscription_status is NEVER written from client code — only the Stripe
// webhook (server-side, via the service role key) ever updates it. This
// module only reads it and triggers redirects to Stripe-hosted pages.

import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'

export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'

export type SubscriptionInfo = {
  status: SubscriptionStatus
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  loading: boolean
}

// Statuses that mean "let them use the app." Everything else shows the paywall.
export function hasActiveAccess(status: SubscriptionStatus): boolean {
  return status === 'trialing' || status === 'active'
}

export function useSubscription(userId: string | null): SubscriptionInfo {
  const [info, setInfo] = useState<SubscriptionInfo>({ status: 'none', trialEndsAt: null, currentPeriodEnd: null, loading: true })

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !userId) {
      setInfo({ status: 'none', trialEndsAt: null, currentPeriodEnd: null, loading: false })
      return
    }
    let cancelled = false

    async function load() {
      const { data } = await supabase!
        .from('profiles')
        .select('subscription_status, trial_ends_at, subscription_current_period_end')
        .eq('id', userId)
        .maybeSingle()
      if (cancelled) return
      setInfo({
        status: (data?.subscription_status as SubscriptionStatus) ?? 'none',
        trialEndsAt: data?.trial_ends_at ?? null,
        currentPeriodEnd: data?.subscription_current_period_end ?? null,
        loading: false,
      })
    }
    load()

    // Refresh when returning to the tab (e.g. after completing Stripe
    // Checkout in the same browser and getting redirected back).
    function onVisible() {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisible) }
  }, [userId])

  return info
}

async function authedFetch(path: string): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: 'Not configured' }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'You need to be signed in.' }
  try {
    const res = await fetch(path, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error || 'Something went wrong — please try again.' }
    return { url: body.url }
  } catch {
    return { error: "Couldn't reach the server — check your connection and try again." }
  }
}

export async function startCheckout(): Promise<{ error?: string }> {
  const { url, error } = await authedFetch('/.netlify/functions/create-checkout-session')
  if (error) return { error }
  if (url) window.location.href = url
  return {}
}

export async function openBillingPortal(): Promise<{ error?: string }> {
  const { url, error } = await authedFetch('/.netlify/functions/create-portal-session')
  if (error) return { error }
  if (url) window.location.href = url
  return {}
}
