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

    async function load(): Promise<SubscriptionStatus> {
      const { data } = await supabase!
        .from('profiles')
        .select('subscription_status, trial_ends_at, subscription_current_period_end')
        .eq('id', userId)
        .maybeSingle()
      if (cancelled) return 'none'
      const status = (data?.subscription_status as SubscriptionStatus) ?? 'none'
      setInfo({
        status,
        trialEndsAt: data?.trial_ends_at ?? null,
        currentPeriodEnd: data?.subscription_current_period_end ?? null,
        loading: false,
      })
      return status
    }
    load()

    // Just returned from a successful Stripe Checkout: the webhook that
    // actually records this in the database fires asynchronously, on
    // Stripe's own timing — there's no guarantee it's finished before this
    // page loads and does its one-shot check above. Relying on that single
    // check (or on visibilitychange, which only fires if the user happens to
    // switch tabs) meant someone could land on the paywall right after truly
    // paying, with no way to know it would resolve itself. This polls for a
    // real window instead, so "just subscribed" reliably unlocks the app
    // without depending on an incidental tab-switch to notice.
    const justCheckedOut = new URLSearchParams(window.location.search).get('checkout') === 'success'
    let pollTimer: ReturnType<typeof setInterval> | null = null
    if (justCheckedOut) {
      let attempts = 0
      pollTimer = setInterval(async () => {
        attempts++
        const status = await load()
        if (cancelled || hasActiveAccess(status) || attempts >= 10) {
          if (pollTimer) clearInterval(pollTimer)
          // Clean the URL so refreshing later doesn't re-trigger polling.
          window.history.replaceState({}, '', window.location.pathname)
        }
      }, 1500); // 10 attempts × 1.5s = up to 15s of polling
    }

    function onVisible() {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
      document.removeEventListener('visibilitychange', onVisible)
    }
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
