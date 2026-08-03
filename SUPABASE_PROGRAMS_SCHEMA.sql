-- Ascend v2 — Coach Programs Phase 1: schema for multi-chapter, video-based
-- paid programs. Run this once in your Supabase SQL Editor.
--
-- SCOPE NOTE: this schema is built now, but video playback in this phase
-- uses Mux's `public` playback policy — meaning any uploaded video is
-- technically watchable by anyone with its playback URL, not yet gated by
-- actual purchase. That's deliberate: this phase is the upload pipeline
-- foundation. Real purchase verification + Mux `signed` playback policy is
-- the very next phase, agreed on before any of this goes live for real paid
-- content — do not treat this schema alone as "purchase-protected."

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  price_cents integer not null default 0, -- e.g. 2900 = $29.00
  status text not null default 'draft', -- 'draft' | 'published'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table programs enable row level security;

-- Anyone can see a published program (for Discover/browsing the syllabus
-- before buying) — drafts stay visible only to the coach who owns them.
create policy "anyone can view published programs" on programs for select
  using (status = 'published' or coach_user_id = auth.uid());
create policy "coach manages own programs" on programs for insert
  with check (coach_user_id = auth.uid());
create policy "coach updates own programs" on programs for update
  using (coach_user_id = auth.uid()) with check (coach_user_id = auth.uid());
create policy "coach deletes own programs" on programs for delete
  using (coach_user_id = auth.uid());

create table if not exists program_chapters (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  title text not null,
  order_index integer not null default 0,
  mux_upload_id text, -- Mux's upload id, used to correlate the webhook back to this row
  mux_asset_id text,
  mux_playback_id text,
  video_status text not null default 'pending', -- 'pending' | 'ready' | 'error'
  linked_workout jsonb, -- optional Exercise[] — same shape used everywhere else, so a
                         -- chapter can say "watch this, then log these exact sets"
  created_at timestamptz not null default now()
);

alter table program_chapters enable row level security;

-- Chapter titles/order are visible alongside their program (so a "syllabus"
-- can be shown before purchase, same as any course platform) — but note the
-- scope caveat above: this does not yet gate actual video playback.
create policy "chapters visible with their program" on program_chapters for select
  using (exists (
    select 1 from programs p
    where p.id = program_chapters.program_id
      and (p.status = 'published' or p.coach_user_id = auth.uid())
  ));
create policy "coach manages own chapters" on program_chapters for insert
  with check (exists (select 1 from programs p where p.id = program_chapters.program_id and p.coach_user_id = auth.uid()));
create policy "coach updates own chapters" on program_chapters for update
  using (exists (select 1 from programs p where p.id = program_chapters.program_id and p.coach_user_id = auth.uid()))
  with check (exists (select 1 from programs p where p.id = program_chapters.program_id and p.coach_user_id = auth.uid()));
create policy "coach deletes own chapters" on program_chapters for delete
  using (exists (select 1 from programs p where p.id = program_chapters.program_id and p.coach_user_id = auth.uid()));

-- Schema only in this phase — not wired up to real Stripe purchases yet.
-- That's the very next phase.
create table if not exists program_purchases (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_payment_intent_id text,
  amount_paid_cents integer,
  purchased_at timestamptz not null default now(),
  unique (program_id, user_id)
);

alter table program_purchases enable row level security;

create policy "buyer views own purchases" on program_purchases for select
  using (user_id = auth.uid());
create policy "coach views purchases of own programs" on program_purchases for select
  using (exists (select 1 from programs p where p.id = program_purchases.program_id and p.coach_user_id = auth.uid()));
-- Deliberately no insert/update/delete policy for the authenticated role —
-- same reasoning as the subscription billing table: purchases must only
-- ever be written by the server (via the service role key, after a real
-- Stripe payment succeeds), never directly by a client, or anyone could
-- just insert their own "purchase" row for free.
