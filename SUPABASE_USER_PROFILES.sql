-- Ascend v2 — member profile pictures
--
-- Run this ONCE in your Supabase SQL Editor, after
-- SUPABASE_CATCH_UP_AND_COACH_PLANS.sql. Safe to run again at any time:
-- every statement either checks first or drops and recreates cleanly.
--
-- WHY A SEPARATE TABLE
-- The existing `profiles` table is locked to its owner — its RLS policy is
-- `using (auth.uid() = id)`, so nobody can read anyone else's row. That is
-- correct, because `profiles` holds private data. But it means an avatar
-- stored there would be invisible to everyone except the person who
-- uploaded it, which defeats the point of a profile picture.
--
-- So this mirrors the approach already used for coach_profiles: a small,
-- deliberately public table holding only what is safe for other members of
-- a group to see — a display name and a picture. Nothing private goes here.


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. user_profiles
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

-- Readable by any signed-in user. These rows exist precisely so other
-- members of a group can see who posted something; there is nothing
-- sensitive in them. Restricting reads to "people in a group with me" would
-- need a join back to group_members from a policy, which is exactly the
-- recursion this project already hit once — and it would buy nothing, since
-- a display name and a picture are what the user chose to show.
drop policy if exists "signed-in users can view member profiles" on user_profiles;
create policy "signed-in users can view member profiles" on user_profiles for select
  using (auth.uid() is not null);

-- You can only ever create or change your own.
drop policy if exists "user creates own profile" on user_profiles;
create policy "user creates own profile" on user_profiles for insert
  with check (user_id = auth.uid());

drop policy if exists "user updates own profile" on user_profiles;
create policy "user updates own profile" on user_profiles for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user deletes own profile" on user_profiles;
create policy "user deletes own profile" on user_profiles for delete
  using (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Storage for member avatars
-- ═══════════════════════════════════════════════════════════════════════════
-- Public-read, same as the coach images and group post photos: a profile
-- picture is shown to other members by design.

insert into storage.buckets (id, name, public)
values ('user-avatars', 'user-avatars', true)
on conflict (id) do nothing;

-- Writes are restricted to the user's OWN folder. Files are stored as
-- `<user_id>/avatar-<timestamp>.<ext>`, so folder[1] is the owning user's
-- id — nobody can write into anyone else's folder.
drop policy if exists "user uploads own avatar" on storage.objects;
create policy "user uploads own avatar" on storage.objects for insert
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user updates own avatar" on storage.objects;
create policy "user updates own avatar" on storage.objects for update
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user deletes own avatar" on storage.objects;
create policy "user deletes own avatar" on storage.objects for delete
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- DONE — verification. Both rows should say EXISTS / OK.
-- ═══════════════════════════════════════════════════════════════════════════

select 'user_profiles table' as "Check",
       case when to_regclass('public.user_profiles') is not null then 'EXISTS' else 'MISSING' end as "Status"
union all
select 'user-avatars bucket',
       case when exists (select 1 from storage.buckets where id = 'user-avatars') then 'OK' else 'MISSING' end;
