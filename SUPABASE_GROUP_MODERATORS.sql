-- Ascend v2 — Community moderators. Run this once in your Supabase SQL Editor.
--
-- Lets a coach promote a member to moderator, who can then delete
-- inappropriate posts and remove disruptive regular members — but
-- deliberately cannot remove the coach or other moderators, so a moderator
-- can't be used to stage a takeover of someone else's group.

-- The role column already accepts free text ('coach' | 'member' so far) —
-- 'moderator' is just a new value in the same column, no schema change
-- needed there. This function follows the exact same safe pattern as
-- is_group_coach/is_group_member (already proven correct during the earlier
-- RLS recursion fix).
create or replace function is_group_moderator(check_group_id uuid, check_user_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (
    select 1 from group_members
    where group_id = check_group_id and user_id = check_user_id and role = 'moderator'
  );
end;
$$;

-- Only the coach can change a member's role (promote/demote moderator).
create policy "coach assigns moderator role" on group_members for update
  using (is_group_coach(group_id, auth.uid()))
  with check (is_group_coach(group_id, auth.uid()));

-- A moderator can remove a regular member — but explicitly NOT the coach or
-- another moderator, checked against the row actually being deleted.
create policy "moderator removes regular members" on group_members for delete
  using (
    is_group_moderator(group_id, auth.uid())
    and role = 'member'
  );

-- Moderators can also delete posts, alongside the coach (existing policy).
create policy "moderator can delete posts in own group" on group_posts for delete
  using (is_group_moderator(group_id, auth.uid()));
