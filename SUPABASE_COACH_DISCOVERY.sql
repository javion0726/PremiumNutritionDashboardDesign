-- Ascend v2 — Coach Marketplace, Phase 1: coach profiles + public/private
-- groups + discovery. Run this once in your Supabase SQL Editor.

-- ─── coach_profiles — deliberately separate from `profiles` ────────────────
-- `profiles` holds billing/subscription data that must never be publicly
-- readable. Rather than carefully carve out one column of a sensitive table
-- to be public, this is its own table with only what's safe to show anyone:
-- a display name and bio. A coach creates this the first time they make a
-- group public.
create table if not exists coach_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table coach_profiles enable row level security;

-- Public by definition — anyone can view any coach's profile.
create policy "anyone can view coach profiles" on coach_profiles for select
  using (true);
-- Only the coach can create or edit their own.
create policy "coach creates own profile" on coach_profiles for insert
  with check (user_id = auth.uid());
create policy "coach updates own profile" on coach_profiles for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── groups: add public/private ─────────────────────────────────────────────
alter table groups add column if not exists is_public boolean not null default false;

-- Additive policy — combines with the existing member/coach visibility
-- policies via OR, so this only ever adds visibility (public groups become
-- visible to everyone for discovery), never removes what already worked.
create policy "anyone can view public groups" on groups for select
  using (is_public = true);

-- ─── safe member count for discovery ────────────────────────────────────────
-- Shows "X members" on a public group's discovery card without exposing
-- who those members actually are — group_members itself stays exactly as
-- private as before; this only ever returns a number.
create or replace function get_public_group_member_count(target_group_id uuid)
returns integer
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  member_count integer;
begin
  select count(*) into member_count
  from group_members
  where group_id = target_group_id and role = 'member';
  return member_count;
end;
$$;
