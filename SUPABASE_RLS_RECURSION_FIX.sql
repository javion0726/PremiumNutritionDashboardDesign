-- Ascend v2 — fix for "infinite recursion detected in policy for relation
-- groups". Run this once in your Supabase SQL Editor.
--
-- WHAT WENT WRONG: groups' SELECT policy checked group_members to see if
-- you're a member, and group_members' SELECT policy checked groups right
-- back to see if you're the coach — a circular reference. Postgres detects
-- these cycles and refuses to run the query rather than loop forever.
--
-- THE FIX: wrap each check in its own function, marked SECURITY DEFINER, so
-- it runs with elevated privileges that bypass RLS on the table it's
-- checking — breaking the cycle. One easy-to-miss detail: this function
-- MUST be written as `language plpgsql`, not `language sql`. Postgres can
-- silently inline simple SQL functions during query planning, which quietly
-- throws away the SECURITY DEFINER bypass and brings the recursion right
-- back even though the function looks correct. plpgsql functions are never
-- inlined, so this is the version that actually holds.

create or replace function is_group_member(check_group_id uuid, check_user_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (
    select 1 from group_members
    where group_id = check_group_id and user_id = check_user_id
  );
end;
$$;

create or replace function is_group_coach(check_group_id uuid, check_user_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (
    select 1 from groups
    where id = check_group_id and coach_user_id = check_user_id
  );
end;
$$;

drop policy if exists "members can view their groups" on groups;
create policy "members can view their groups" on groups for select
  using (is_group_member(id, auth.uid()));

drop policy if exists "members can view their own membership rows" on group_members;
create policy "members can view their own membership rows" on group_members for select
  using (user_id = auth.uid() or is_group_coach(group_id, auth.uid()));

drop policy if exists "coach manages membership" on group_members;
create policy "coach manages membership" on group_members for insert
  with check (is_group_coach(group_id, auth.uid()));

drop policy if exists "coach removes membership" on group_members;
create policy "coach removes membership" on group_members for delete
  using (is_group_coach(group_id, auth.uid()));
