-- Ascend v2 — reverts the coach verification requirement for creating
-- groups and programs. Run this once in your Supabase SQL Editor.
--
-- This restores open creation for both — anyone can create a group or
-- program again, same as before verification was added. The
-- coach_applications table, coach_status/is_admin columns, and their
-- protective trigger are left in place (harmless, unused) rather than
-- deleted, in case this is wanted again later — reversing this specific
-- change back doesn't require rebuilding any of that from scratch.

drop policy if exists "approved coach creates groups" on groups;
create policy "coach creates own groups" on groups for insert
  with check (coach_user_id = auth.uid());

drop policy if exists "approved coach creates programs" on programs;
create policy "coach creates own programs" on programs for insert
  with check (coach_user_id = auth.uid());
