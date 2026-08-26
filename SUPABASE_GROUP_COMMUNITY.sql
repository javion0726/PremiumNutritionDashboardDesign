-- Ascend v2 — per-group Community tab: posts, questions, and photos, scoped
-- to one group's own members (not a global feed). Run this once in your
-- Supabase SQL Editor.

create table if not exists group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text,
  image_url text,
  created_at timestamptz not null default now()
);

alter table group_posts enable row level security;

-- Reuses the same is_group_member/is_group_coach functions already built
-- and proven safe during the earlier RLS recursion fix — no new risk of
-- that same circular-policy bug here.
create policy "members can view group posts" on group_posts for select
  using (is_group_member(group_id, auth.uid()) or is_group_coach(group_id, auth.uid()));

create policy "members can create own posts" on group_posts for insert
  with check (
    user_id = auth.uid()
    and (is_group_member(group_id, auth.uid()) or is_group_coach(group_id, auth.uid()))
  );

create policy "users delete own posts" on group_posts for delete
  using (user_id = auth.uid());

-- The coach can also remove posts in their own group — basic moderation,
-- separate from a member deleting their own post.
create policy "coach can delete posts in own group" on group_posts for delete
  using (is_group_coach(group_id, auth.uid()));

-- ─── Storage for post photos ────────────────────────────────────────────
-- SCOPE NOTE, stated plainly: this bucket is public — meaning anyone who
-- somehow obtained the exact image URL could view it without being a group
-- member, since public buckets bypass Storage's own access control entirely.
-- What IS enforced: only an actual member (or the coach) of a group can
-- upload into that group's folder, and the URL itself is only ever
-- referenced through group_posts rows, which real RLS above does gate
-- correctly. This is a common, accepted tradeoff for this kind of
-- lower-sensitivity, non-guessable-URL content (the same model many
-- consumer apps use for shared image links) — not a claim that these images
-- are cryptographically private.
insert into storage.buckets (id, name, public)
values ('group-post-images', 'group-post-images', true)
on conflict (id) do nothing;

create policy "group members can upload post images" on storage.objects for insert
  with check (
    bucket_id = 'group-post-images'
    and (
      is_group_member((storage.foldername(name))[1]::uuid, auth.uid())
      or is_group_coach((storage.foldername(name))[1]::uuid, auth.uid())
    )
  );

create policy "users can delete own uploaded post images" on storage.objects for delete
  using (bucket_id = 'group-post-images' and owner = auth.uid());
