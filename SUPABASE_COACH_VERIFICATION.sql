-- Ascend v2 — Coach Verification Gate. Run this once in your Supabase SQL Editor.
--
-- WHAT THIS DOES: requires approval before anyone can create a group (any
-- group — this was a deliberate decision to gate ALL coaching activity, not
-- just paid content, given real fraud/trust concerns) or publish a Program.
-- Free participation as a MEMBER (joining groups, browsing, buying) stays
-- completely open — this only gates the ability to act as a coach at all.

-- ─── coach applications ──────────────────────────────────────────────────
create table if not exists coach_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  bio text not null,
  years_experience integer,
  specialties text,
  certifications text,
  status text not null default 'pending', -- 'pending' | 'approved' | 'rejected'
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_notes text
);

alter table coach_applications enable row level security;

create policy "user views own application" on coach_applications for select
  using (user_id = auth.uid());
create policy "user submits own application" on coach_applications for insert
  with check (user_id = auth.uid());
-- Deliberately no update/delete policy for the authenticated role — only
-- the server (via review-coach-application.mjs, using the service role key)
-- can change an application's status. Same reasoning as every other
-- server-only-writable field in this app: if a user could update their own
-- application, they could just mark themselves approved.

-- ─── coach_status + is_admin on profiles ────────────────────────────────
alter table profiles add column if not exists coach_status text not null default 'none'; -- 'none' | 'pending' | 'approved' | 'rejected'
alter table profiles add column if not exists is_admin boolean not null default false;

-- SECURITY — extends the exact same protection pattern already used for
-- subscription_status: profiles has a broad "own profile" policy that would
-- otherwise let a user set their own coach_status to 'approved' or grant
-- themselves is_admin directly. This trigger blocks changes to these two
-- columns specifically unless the request comes from the service_role
-- connection (i.e. only the review-coach-application function, never the browser).
create or replace function protect_coach_admin_columns()
returns trigger as $$
begin
  if auth.role() <> 'service_role' then
    if new.coach_status is distinct from old.coach_status
       or new.is_admin is distinct from old.is_admin
    then
      raise exception 'Coach status and admin flags can only be changed by the server';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists protect_coach_admin_columns_trigger on profiles;
create trigger protect_coach_admin_columns_trigger
  before update on profiles
  for each row execute function protect_coach_admin_columns();

-- ─── gate group creation on approved coach status ───────────────────────
-- Split out of the old "coach manages own groups" (which covered
-- select/insert/update/delete together) so the approval check applies only
-- to creating a NEW group — an already-approved coach's existing groups
-- stay manageable even if their status were ever revisited later.
drop policy if exists "coach manages own groups" on groups;

create policy "approved coach creates groups" on groups for insert
  with check (
    coach_user_id = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.coach_status = 'approved')
  );
create policy "coach views own groups" on groups for select
  using (coach_user_id = auth.uid());
create policy "coach updates own groups" on groups for update
  using (coach_user_id = auth.uid()) with check (coach_user_id = auth.uid());
create policy "coach deletes own groups" on groups for delete
  using (coach_user_id = auth.uid());

-- ─── gate program creation on approved coach status ─────────────────────
drop policy if exists "coach manages own programs" on programs;

create policy "approved coach creates programs" on programs for insert
  with check (
    coach_user_id = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.coach_status = 'approved')
  );
