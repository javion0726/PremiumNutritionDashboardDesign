-- Ascend v2 — enables true live updates for coach groups.
-- Run this once in your Supabase SQL Editor.
--
-- This adds the two group-related tables to Supabase's realtime publication.
-- Realtime respects your existing RLS policies automatically — a member
-- only ever receives live updates for rows they could already SELECT
-- (workouts posted to groups they're in; their own results for a coach
-- viewing that group's workouts). No new security surface is introduced.

alter publication supabase_realtime add table group_workouts;
alter publication supabase_realtime add table group_workout_logs;
