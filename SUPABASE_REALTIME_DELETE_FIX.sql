-- Ascend v2 — fixes DELETE events not being received via Realtime for
-- group workouts. Run this once in your Supabase SQL Editor.
--
-- WHAT WAS WRONG: by default, Postgres only includes a row's primary key in
-- a DELETE event's payload (not the rest of its columns). The Realtime
-- subscription filters by group_id ("only tell me about changes to this
-- group") — but group_id isn't the primary key, so for DELETE specifically,
-- it was never present in the payload for the filter to check against. The
-- event was silently dropped before ever reaching the client, not because
-- of a permissions issue, but because there was nothing to filter on.
--
-- THE FIX: REPLICA IDENTITY FULL tells Postgres to include every column
-- (not just the primary key) when a row is deleted, so the group_id filter
-- has something to actually match against.

alter table group_workouts replica identity full;
alter table group_workout_logs replica identity full;
