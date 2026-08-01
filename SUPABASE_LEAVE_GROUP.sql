-- Ascend v2 — adds the ability for a member to leave a group themselves.
-- Run this once in your Supabase SQL Editor.
-- (Only the coach could remove a member before; this adds the member's own
-- ability to leave, without touching the existing coach-removal policy.)

create policy "members can leave a group" on group_members for delete
  using (user_id = auth.uid());
