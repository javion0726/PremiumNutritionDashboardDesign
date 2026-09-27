-- Ascend v2 — database catch-up + coach plans and coach images
--
-- Run this ONCE in your Supabase SQL Editor. It is safe to run again if
-- you're ever unsure whether it finished: every statement either checks
-- first (create table if not exists / add column if not exists) or drops
-- and recreates cleanly (policies), so re-running changes nothing and
-- cannot error or duplicate anything.
--
-- WHY THIS FILE EXISTS
-- A check of the live database found three tables missing that the app's
-- code already expects:
--   • coach_profiles — coach display name, bio (and now photos)
--   • group_posts    — the per-group Community feed
--   • coach_plans    — new in this release
-- The app's Community tab and coach profile screens were already deployed,
-- but the tables behind them were never created, so those screens would
-- appear and then fail the moment they were actually used. This file
-- creates everything that's missing, in the right order, in one run.
--
-- Nothing here deletes or rewrites existing data.


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. SHARED HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════
-- Several policies below ask "is this user a member / the coach / a
-- moderator of this group?". Asking that directly inside a policy on
-- group_members causes infinite recursion (a policy that needs to read the
-- very table it guards). These security-definer functions sidestep that —
-- the same approach already proven in this project's earlier RLS fix.
--
-- `create or replace` means running this on a database that already has
-- them is a no-op that simply rewrites them identically.

create or replace function is_group_member(check_group_id uuid, check_user_id uuid)
returns boolean language plpgsql security definer stable set search_path = public as $$
begin
  return exists (select 1 from group_members where group_id = check_group_id and user_id = check_user_id);
end;
$$;

create or replace function is_group_coach(check_group_id uuid, check_user_id uuid)
returns boolean language plpgsql security definer stable set search_path = public as $$
begin
  return exists (select 1 from groups where id = check_group_id and coach_user_id = check_user_id);
end;
$$;

create or replace function is_group_moderator(check_group_id uuid, check_user_id uuid)
returns boolean language plpgsql security definer stable set search_path = public as $$
begin
  return exists (
    select 1 from group_members
    where group_id = check_group_id and user_id = check_user_id and role = 'moderator'
  );
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. COACH PROFILES  (was missing)
-- ═══════════════════════════════════════════════════════════════════════════
-- Deliberately separate from `profiles`, which holds billing data that must
-- never be publicly readable. This table holds only what is safe to show
-- anyone: a display name, a bio, and now an avatar and banner.

create table if not exists coach_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The two image columns. Both nullable, so a coach who never uploads a
-- photo still has a perfectly valid profile.
alter table coach_profiles add column if not exists avatar_url text;
alter table coach_profiles add column if not exists banner_url text;

alter table coach_profiles enable row level security;

drop policy if exists "anyone can view coach profiles" on coach_profiles;
create policy "anyone can view coach profiles" on coach_profiles for select
  using (true);

drop policy if exists "coach creates own profile" on coach_profiles;
create policy "coach creates own profile" on coach_profiles for insert
  with check (user_id = auth.uid());

drop policy if exists "coach updates own profile" on coach_profiles;
create policy "coach updates own profile" on coach_profiles for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. PUBLIC / PRIVATE GROUPS + DISCOVERY
-- ═══════════════════════════════════════════════════════════════════════════

alter table groups add column if not exists is_public boolean not null default false;

-- Additive: combines with the existing member/coach visibility policies via
-- OR, so this only ever adds visibility (public groups become findable in
-- Discover) and never removes access that already worked.
drop policy if exists "anyone can view public groups" on groups;
create policy "anyone can view public groups" on groups for select
  using (is_public = true);

-- Shows "X members" on a discovery card without exposing who those members
-- are — group_members itself stays exactly as private as before; this only
-- ever returns a number.
create or replace function get_public_group_member_count(target_group_id uuid)
returns integer language plpgsql security definer stable set search_path = public as $$
declare
  member_count integer;
begin
  select count(*) into member_count
  from group_members
  where group_id = target_group_id and role = 'member';
  return member_count;
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. GROUP COMMUNITY FEED  (was missing)
-- ═══════════════════════════════════════════════════════════════════════════
-- The per-group post feed. Scoped to one group's own members, not a global
-- feed.

create table if not exists group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text,
  image_url text,
  created_at timestamptz not null default now()
);

alter table group_posts enable row level security;

drop policy if exists "members can view group posts" on group_posts;
create policy "members can view group posts" on group_posts for select
  using (is_group_member(group_id, auth.uid()) or is_group_coach(group_id, auth.uid()));

drop policy if exists "members can create own posts" on group_posts;
create policy "members can create own posts" on group_posts for insert
  with check (
    user_id = auth.uid()
    and (is_group_member(group_id, auth.uid()) or is_group_coach(group_id, auth.uid()))
  );

drop policy if exists "users delete own posts" on group_posts;
create policy "users delete own posts" on group_posts for delete
  using (user_id = auth.uid());

drop policy if exists "coach can delete posts in own group" on group_posts;
create policy "coach can delete posts in own group" on group_posts for delete
  using (is_group_coach(group_id, auth.uid()));

drop policy if exists "moderator can delete posts in own group" on group_posts;
create policy "moderator can delete posts in own group" on group_posts for delete
  using (is_group_moderator(group_id, auth.uid()));

-- Storage for post photos.
-- SCOPE NOTE, stated plainly: this bucket is public — anyone who obtained
-- the exact image URL could view it without being a group member, because
-- public buckets bypass Storage's own access control. What IS enforced is
-- that only a real member (or the coach) can upload into a group's folder,
-- and URLs are only ever surfaced through group_posts rows, which the RLS
-- above does gate correctly. This is the same tradeoff most consumer apps
-- make for shared image links — not a claim that these images are private.
insert into storage.buckets (id, name, public)
values ('group-post-images', 'group-post-images', true)
on conflict (id) do nothing;

drop policy if exists "group members can upload post images" on storage.objects;
create policy "group members can upload post images" on storage.objects for insert
  with check (
    bucket_id = 'group-post-images'
    and (
      is_group_member((storage.foldername(name))[1]::uuid, auth.uid())
      or is_group_coach((storage.foldername(name))[1]::uuid, auth.uid())
    )
  );

drop policy if exists "users can delete own uploaded post images" on storage.objects;
create policy "users can delete own uploaded post images" on storage.objects for delete
  using (bucket_id = 'group-post-images' and owner = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. MODERATORS
-- ═══════════════════════════════════════════════════════════════════════════
-- A coach can promote a member to moderator. A moderator can delete posts
-- and remove disruptive regular members — but deliberately cannot remove
-- the coach or another moderator, so a moderator can't stage a takeover of
-- someone else's group. That limit is enforced here in the database, not
-- just hidden in the UI.

drop policy if exists "coach assigns moderator role" on group_members;
create policy "coach assigns moderator role" on group_members for update
  using (is_group_coach(group_id, auth.uid()))
  with check (is_group_coach(group_id, auth.uid()));

drop policy if exists "moderator removes regular members" on group_members;
create policy "moderator removes regular members" on group_members for delete
  using (is_group_moderator(group_id, auth.uid()) and role = 'member');


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. COACH PLANS  (new)
-- ═══════════════════════════════════════════════════════════════════════════
-- A coach plan is deliberately stored in the SAME shape as the app's
-- built-in weekly plans (a 7-slot Mon–Sun schedule of days, each either rest
-- or a list of exercises). Keeping the shape identical means the existing
-- workout screen, day view, set logging, rest timer and PR detection all
-- work on a coach plan unchanged — it's just a plan that comes from the
-- database instead of from code.

create table if not exists coach_plans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  total_weeks integer not null default 8 check (total_weeks between 1 and 52),
  -- The full 7-slot week, same PlanDay[] shape used everywhere else:
  -- [{ day, label, type, exercises: [{ name, sets, reps, weight, notes }] }]
  schedule jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coach_plans_group_idx on coach_plans(group_id);

alter table coach_plans enable row level security;

-- Anyone in the group can see that group's plans — the same visibility rule
-- already used for posted workouts, so a plan is exactly as visible as the
-- workouts sitting alongside it, no more and no less.
drop policy if exists "members can view group coach plans" on coach_plans;
create policy "members can view group coach plans" on coach_plans for select
  using (is_group_member(group_id, auth.uid()) or is_group_coach(group_id, auth.uid()));

-- Only the coach who owns the group can create, edit or delete its plans.
-- Checked against groups.coach_user_id — the real owner — rather than
-- trusting the coach_user_id value sent by the app.
drop policy if exists "coach creates own group plans" on coach_plans;
create policy "coach creates own group plans" on coach_plans for insert
  with check (is_group_coach(group_id, auth.uid()));

drop policy if exists "coach updates own group plans" on coach_plans;
create policy "coach updates own group plans" on coach_plans for update
  using (is_group_coach(group_id, auth.uid()))
  with check (is_group_coach(group_id, auth.uid()));

drop policy if exists "coach deletes own group plans" on coach_plans;
create policy "coach deletes own group plans" on coach_plans for delete
  using (is_group_coach(group_id, auth.uid()));


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. COACH PROFILE IMAGES — storage
-- ═══════════════════════════════════════════════════════════════════════════
-- Public-read by design: these show on public Discover cards and on members'
-- home screens, so they are public content by definition.

insert into storage.buckets (id, name, public)
values ('coach-images', 'coach-images', true)
on conflict (id) do nothing;

-- Writes are restricted to the coach's OWN folder. Files are stored as
-- `<user_id>/avatar-<timestamp>.<ext>`, so folder[1] is the owning user's
-- id and a coach can never write into another coach's folder.
drop policy if exists "coach uploads own images" on storage.objects;
create policy "coach uploads own images" on storage.objects for insert
  with check (
    bucket_id = 'coach-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "coach updates own images" on storage.objects;
create policy "coach updates own images" on storage.objects for update
  using (
    bucket_id = 'coach-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "coach deletes own images" on storage.objects;
create policy "coach deletes own images" on storage.objects for delete
  using (
    bucket_id = 'coach-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- DONE — verification
-- ═══════════════════════════════════════════════════════════════════════════
-- This final query prints one row per table so you can see at a glance that
-- everything landed. Every row should say EXISTS.

select
  t.name as "Table",
  case when to_regclass('public.' || t.name) is not null
       then 'EXISTS' else 'MISSING' end as "Status"
from (values
  ('groups'), ('group_members'), ('group_workouts'), ('group_workout_logs'),
  ('group_posts'), ('coach_profiles'), ('programs'), ('coach_plans')
) as t(name);
