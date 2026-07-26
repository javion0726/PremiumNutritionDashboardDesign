// Ascend — Supabase client
//
// Setup required (Vite env vars must be prefixed VITE_ to be exposed to the
// browser bundle — this is a Vite convention, not a security workaround; the
// anon key is designed to be public, real protection comes from RLS):
//
//   VITE_SUPABASE_URL=https://xxxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=xxxxx
//
// Add these in Netlify: Site configuration → Environment variables (and in a
// local .env file for `vite dev`). Run SUPABASE_SCHEMA.sql in your Supabase
// project's SQL editor before any of this does anything.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = !!url && !!anonKey

// A real client is only constructed when configured — every caller elsewhere
// checks isSupabaseConfigured first, so this null case should never actually
// be dereferenced, but the type stays honest about it instead of asserting.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    'Supabase is not configured — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. ' +
    'Auth and cloud sync are disabled; the app falls back to local-only mode.'
  )
}
