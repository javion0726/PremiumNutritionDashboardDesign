-- Ascend — Subscriptions migration
-- Run this once in your Supabase project's SQL Editor, AFTER SUPABASE_SCHEMA.sql
-- has already been run. This only adds columns to the existing `profiles`
-- table — it does not touch anything else.

alter table profiles add column if not exists stripe_customer_id text;
alter table profiles add column if not exists stripe_subscription_id text;

-- 'none' (never subscribed) | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
alter table profiles add column if not exists subscription_status text not null default 'none';

alter table profiles add column if not exists trial_ends_at timestamptz;
alter table profiles add column if not exists subscription_current_period_end timestamptz;

-- Fast lookup by Stripe customer ID — the webhook handler needs to find
-- "which of our users does this Stripe event belong to" quickly.
create index if not exists profiles_stripe_customer_id_idx on profiles(stripe_customer_id);

-- No new RLS policy needed for reading — the existing "own profile" policy
-- (auth.uid() = id) already covers these new columns since they're just more
-- fields on the same row a user could already read.
--
-- Writing to subscription_status, however, should NEVER happen from the
-- client — only the Stripe webhook handler (using the service role key,
-- which bypasses RLS entirely) should ever update these fields. That's
-- enforced by not writing any client-side code that touches these columns,
-- not by an RLS policy — the webhook is intentionally the only writer.
