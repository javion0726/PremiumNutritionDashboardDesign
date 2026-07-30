-- Ascend v2 — Coach Groups schema
-- Run this once in your Supabase SQL Editor (in addition to SUPABASE_SCHEMA.sql
-- and SUPABASE_BILLING_SCHEMA.sql, which should already be applied).
--
-- This builds on the `groups` and `group_members` tables created empty back
-- in the original schema specifically so this feature wouldn't need a
-- schema rework when it was time to actually build it.

-- A short, human-typeable code members use to join a group. Separate from
-- the group's real id (a UUID) so the id itself doesn't have to double as a
-- secret — this can be regenerated/rotated without changing the group's
-- real identity.
alter table groups add column if not exists invite_code text unique;

-- ─── group_workouts — what a coach posts to their group ────────────────────
create table if not exists group_workouts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  posted_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  exercises jsonb not null default '[]'::jsonb, -- same Exercise[] shape used everywhere else in the app
  notes text,
  posted_at timestamptz not null default now()
);

alter table group_workouts enable row level security;

-- Members of the group (and the coach) can see workouts posted to it.
create policy "members can view group workouts" on group_workouts for select
  using (
    exists (select 1 from group_members m where m.group_id = group_workouts.group_id and m.user_id = auth.uid())
    or exists (select 1 from groups g where g.id = group_workouts.group_id and g.coach_user_id = auth.uid())
  );

-- Only the coach who owns the group can post to it.
create policy "coach can post workouts to own group" on group_workouts for insert
  with check (exists (select 1 from groups g where g.id = group_workouts.group_id and g.coach_user_id = auth.uid()));

create policy "coach can delete own posted workouts" on group_workouts for delete
  using (exists (select 1 from groups g where g.id = group_workouts.group_id and g.coach_user_id = auth.uid()));

-- ─── group_workout_logs — a member's own logged results against a posted workout ──
create table if not exists group_workout_logs (
  id uuid primary key default gen_random_uuid(),
  group_workout_id uuid not null references group_workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercises jsonb not null default '[]'::jsonb, -- the member's actual logged sets/reps/weight
  completed_at timestamptz not null default now(),
  unique (group_workout_id, user_id) -- one result per member per posted workout
);

alter table group_workout_logs enable row level security;

-- A member can see and log their own results.
create policy "members manage own results" on group_workout_logs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- SECURITY — this is the one genuinely new kind of permission in this app:
-- a coach reading another user's logged data. It's scoped as narrowly as
-- possible: only results tied to a workout the coach themselves posted, in a
-- group the coach themselves owns — never a member's private personal
-- journal, measurements, or anything outside what was explicitly done
-- against that specific posted workout.
create policy "coach can view results for workouts they posted" on group_workout_logs for select
  using (exists (
    select 1 from group_workouts gw
    join groups g on g.id = gw.group_id
    where gw.id = group_workout_logs.group_workout_id and g.coach_user_id = auth.uid()
  ));
