-- Ascend v2 — Coach profile images + Coach plans
-- Run this ONCE in your Supabase SQL Editor. It is safe to re-run: every
-- statement is guarded (if not exists / on conflict / drop policy first), so
-- running it twice will not error or duplicate anything.
--
-- Two features in one file so there's only one thing to run:
--   1. Coach profile images (avatar + banner)
--   2. Coach plans (a multi-week plan a coach builds for their group)


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. COACH PROFILE IMAGES
-- ═══════════════════════════════════════════════════════════════════════════

-- coach_profiles already exists (display_name + bio). These are additive —
-- both nullable, so every existing coach profile stays valid with no
-- backfill and nothing breaks if a coach never uploads an image.
alter table coach_profiles add column if not exists avatar_url text;
alter table coach_profiles add column if not exists banner_url text;

-- Storage bucket for coach avatars and banners. Public-read, exactly like
-- the existing group-post-images bucket: these images are shown on public
-- Discover cards and on members' Home screens, so they are public content
-- by definition — there is nothing to hide here.
insert into storage.buckets (id, name, public)
values ('coach-images', 'coach-images', true)
on conflict (id) do nothing;

-- Upload/replace/delete is restricted to the coach's OWN folder. Files are
-- stored as `<user_id>/avatar-<timestamp>.<ext>`, so folder[1] is the owning
-- user's id and a coach can never write into another coach's folder.
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
-- 2. COACH PLANS
-- ═══════════════════════════════════════════════════════════════════════════

-- A coach plan is deliberately stored in the SAME shape as the app's
-- built-in weekly plans (a 7-slot Mon–Sun schedule of days, each day either
-- rest or a list of exercises). Keeping the shape identical means the
-- existing workout screen, day view, set logging, rest timer and PR
-- detection all work on a coach plan with no changes — a coach plan is just
-- a plan that happens to come from the database instead of from code.
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

-- Anyone in the group (member or coach) can see that group's plans. Same
-- visibility rule already used for group_workouts, so a plan is exactly as
-- visible as the workouts posted alongside it — no more, no less.
drop policy if exists "members can view group coach plans" on coach_plans;
create policy "members can view group coach plans" on coach_plans for select
  using (
    exists (select 1 from group_members m where m.group_id = coach_plans.group_id and m.user_id = auth.uid())
    or exists (select 1 from groups g where g.id = coach_plans.group_id and g.coach_user_id = auth.uid())
  );

-- Only the coach who owns the group can create, edit or delete its plans.
-- Checked against groups.coach_user_id (the real owner) rather than trusting
-- the coach_user_id column sent by the client.
drop policy if exists "coach creates own group plans" on coach_plans;
create policy "coach creates own group plans" on coach_plans for insert
  with check (exists (select 1 from groups g where g.id = coach_plans.group_id and g.coach_user_id = auth.uid()));

drop policy if exists "coach updates own group plans" on coach_plans;
create policy "coach updates own group plans" on coach_plans for update
  using (exists (select 1 from groups g where g.id = coach_plans.group_id and g.coach_user_id = auth.uid()))
  with check (exists (select 1 from groups g where g.id = coach_plans.group_id and g.coach_user_id = auth.uid()));

drop policy if exists "coach deletes own group plans" on coach_plans;
create policy "coach deletes own group plans" on coach_plans for delete
  using (exists (select 1 from groups g where g.id = coach_plans.group_id and g.coach_user_id = auth.uid()));
