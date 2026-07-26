-- Ascend — Supabase schema (real accounts, via Supabase Auth)
-- Run this once in your Supabase project's SQL Editor.
--
-- Design notes:
--  - Every table has a user_id referencing auth.users, with RLS restricting
--    each user to their own rows. This is the seam that lets group/coach
--    features (mentioned as a future goal) extend cleanly later: when that
--    lands, policies grow an additional "OR you're in a group with this
--    user" clause rather than requiring a schema rework.
--  - `journal` stores each day as one jsonb blob (mirrors DayEntry in
--    store.ts exactly) rather than exploding exercises/meals into their own
--    tables, because the app always reads/writes a whole day atomically.
--    If cross-user querying (e.g. "everyone's bench PRs" for a coach feed)
--    becomes a real need, THAT specific data (personal records) is the
--    piece worth normalizing into its own table then — not the whole journal.

-- ─── profiles (rj_cfg) ──────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text default '',
  water_unit text default 'oz',
  water_goal numeric default 64,
  weight_unit text default 'lbs',
  activity numeric default 1.55,
  activity_label text default 'Moderate',
  notifications jsonb default '{"all":true,"workout":true,"meal":false,"weekly":true}'::jsonb,
  metric_units boolean default false,
  reduced_motion boolean default false,
  goal text,
  days_per_week int,
  height_cm numeric,
  dob date,
  rest_timer_seconds int,
  member_since timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── journal (rj_journal) — one row per user per day ───────────────────────
create table if not exists journal (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(),
  primary key (user_id, date)
);

-- ─── measurements (rj_meas) ─────────────────────────────────────────────────
create table if not exists measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight text, wu text, fat text,
  waist text, chest text, arms text, hips text, thighs text, mu text,
  updated_at timestamptz default now()
);

-- ─── goals_calc (rj_goals — the calculator's single result object) ─────────
create table if not exists goals_calc (
  user_id uuid primary key references auth.users(id) on delete cascade,
  results jsonb,
  goal_weight numeric,
  start_weight numeric,
  bench_goal numeric,
  streak_goal numeric,
  goal_code text,
  updated_at timestamptz default now()
);

-- ─── goals_list (rj_goals_list — user-created custom goals) ────────────────
create table if not exists goals_list (
  id text primary key,  -- keeps the client-generated g_<timestamp>_<rand> / calc-weight-goal ids as-is
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text,
  unit text,
  dir text,
  start numeric,
  target numeric,
  current numeric,
  deadline date,
  color text,
  linked_metric text,
  linked_exercise text,
  completed boolean default false,
  created_at timestamptz default now()
);

-- ─── active_plan (rj_active_plan) ───────────────────────────────────────────
create table if not exists active_plan (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null,
  current_week int not null,
  current_day_idx int not null,
  start_date date not null,
  updated_at timestamptz default now()
);

-- ─── active_custom (rj_active_custom) ──────────────────────────────────────
create table if not exists active_custom (
  user_id uuid primary key references auth.users(id) on delete cascade,
  exercises jsonb not null default '[]'::jsonb,
  started_at timestamptz not null,
  updated_at timestamptz default now()
);

-- ─── saved_plans (rj_saved_plans) ───────────────────────────────────────────
create table if not exists saved_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
  primary key (user_id, plan_id)
);

-- ─── migration bookkeeping ──────────────────────────────────────────────────
-- Tracks whether the one-time "adopt this device's local data" push has
-- already happened for a user, so it never runs twice and never overwrites
-- data from a second device with a first device's stale local copy.
create table if not exists migration_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  local_data_adopted boolean default false,
  adopted_at timestamptz
);

-- ─── future: groups / coaches (created empty, unused until that feature ships) ──
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member', -- 'coach' | 'member'
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — real per-user isolation via Supabase Auth
-- Unlike the earlier anonymous-backup design, this uses auth.uid(), so a
-- user's data is only ever visible to that authenticated user. No "possession
-- of an ID" tradeoff this time — this is the real thing.
-- ═══════════════════════════════════════════════════════════════════════════

alter table profiles enable row level security;
alter table journal enable row level security;
alter table measurements enable row level security;
alter table goals_calc enable row level security;
alter table goals_list enable row level security;
alter table active_plan enable row level security;
alter table active_custom enable row level security;
alter table saved_plans enable row level security;
alter table migration_status enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own journal" on journal for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own measurements" on measurements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own goals_calc" on goals_calc for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own goals_list" on goals_list for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own active_plan" on active_plan for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own active_custom" on active_custom for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own saved_plans" on saved_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own migration_status" on migration_status for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Groups: a coach manages their own groups; members can see groups they belong to.
create policy "coach manages own groups" on groups for all
  using (auth.uid() = coach_user_id) with check (auth.uid() = coach_user_id);
create policy "members can view their groups" on groups for select
  using (exists (select 1 from group_members m where m.group_id = groups.id and m.user_id = auth.uid()));

create policy "members can view their own membership rows" on group_members for select
  using (user_id = auth.uid() or exists (select 1 from groups g where g.id = group_members.group_id and g.coach_user_id = auth.uid()));
create policy "coach manages membership" on group_members for insert
  with check (exists (select 1 from groups g where g.id = group_members.group_id and g.coach_user_id = auth.uid()));
create policy "coach removes membership" on group_members for delete
  using (exists (select 1 from groups g where g.id = group_members.group_id and g.coach_user_id = auth.uid()));

-- Auto-create a profiles row the moment someone signs up, so the app never
-- has to handle "authenticated but no profile row exists yet" as a state.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, member_since) values (new.id, '', now());
  insert into public.migration_status (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
