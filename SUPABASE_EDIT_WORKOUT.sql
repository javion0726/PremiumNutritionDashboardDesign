-- Ascend v2 — allows a coach to edit a workout they already posted.
-- Run this once in your Supabase SQL Editor.
-- (Deleting a posted workout was already possible; this adds editing.)

create policy "coach can edit own posted workouts" on group_workouts for update
  using (exists (select 1 from groups g where g.id = group_workouts.group_id and g.coach_user_id = auth.uid()))
  with check (exists (select 1 from groups g where g.id = group_workouts.group_id and g.coach_user_id = auth.uid()));
