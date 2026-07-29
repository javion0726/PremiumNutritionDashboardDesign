-- Ascend v2 — Stripe subscription billing schema
-- Run this once in your Supabase project's SQL Editor (separate from and
-- in addition to SUPABASE_SCHEMA.sql, which should already be applied).

alter table profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  -- 'none' = never started checkout, 'trialing' = in the 30-day free trial,
  -- 'active' = paying, 'past_due' = card charge failed, 'canceled' = ended
  add column if not exists subscription_status text not null default 'none',
  add column if not exists trial_ends_at timestamptz,
  add column if not exists subscription_current_period_end timestamptz;

-- SECURITY — read this before changing anything here.
-- profiles already has a broad "own profile" policy that lets a user update
-- ANY column on their own row (name, water_unit, etc. — that's correct for
-- those fields). Without this trigger, that same policy would let a user
-- simply set their own subscription_status to 'active' via a normal client
-- update call, skipping payment entirely. This trigger blocks changes to the
-- billing columns specifically unless the request comes from the
-- service_role connection (i.e. only the Stripe webhook, never the browser).
create or replace function protect_billing_columns()
returns trigger as $$
begin
  if auth.role() <> 'service_role' then
    if new.stripe_customer_id is distinct from old.stripe_customer_id
       or new.stripe_subscription_id is distinct from old.stripe_subscription_id
       or new.subscription_status is distinct from old.subscription_status
       or new.trial_ends_at is distinct from old.trial_ends_at
       or new.subscription_current_period_end is distinct from old.subscription_current_period_end
    then
      raise exception 'Billing fields can only be changed by the server';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists protect_billing_columns_trigger on profiles;
create trigger protect_billing_columns_trigger
  before update on profiles
  for each row execute function protect_billing_columns();
