-- Skin scanner schema
-- Run in Supabase SQL editor, or `supabase db push`.
-- Everything hangs off auth.users — no separate patients table needed,
-- Supabase already gives us that (ponytail rung 4: native platform feature).

create extension if not exists "pgcrypto";

-- One row per tracked mole/lesion.
create table moles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null,                 -- e.g. "left shoulder"
  body_location text,
  created_at timestamptz not null default now()
);

-- One row per photo capture + classification result.
create table photo_analyses (
  id uuid primary key default gen_random_uuid(),
  mole_id uuid not null references moles(id) on delete cascade,
  image_path text not null,            -- path in Supabase Storage bucket 'mole-photos'
  sharpness_score numeric not null,    -- Laplacian variance, computed client-side before upload
  class_probs jsonb not null,          -- {"benign": 0.92, "malignant": 0.08, ...}
  risk_score numeric not null check (risk_score >= 0 and risk_score <= 1),
  created_at timestamptz not null default now()
);

-- One row per spectral (AS7341) reading from the probe. P1.
--
-- reading_type/paired_with implement the lesion+reference protocol: the
-- probe sends two separate readings per session (see app/api/spectral -
-- route.ts for the 5-minute pairing window), and risk_score/pattern_match
-- can only be computed once both sides of a pair exist. A 'reference'
-- reading never gets its own risk_score (it's a baseline, not a lesion);
-- a 'lesion' reading's risk_score/pattern_match start null and get filled
-- in by an UPDATE once its matching reference arrives (or vice versa).
create table spectral_readings (
  id uuid primary key default gen_random_uuid(),
  mole_id uuid not null references moles(id) on delete cascade,
  photo_analysis_id uuid references photo_analyses(id) on delete set null, -- links back to the scan it augments
  reading_type text not null default 'lesion' check (reading_type in ('lesion', 'reference')),
  channels jsonb not null,             -- {"f1":.., ..., "f8":.., "clear":.., "nir":..} 11 AS7341 channels
  paired_with uuid references spectral_readings(id) on delete set null, -- the other reading in this lesion+reference pair, once matched
  risk_score numeric check (risk_score is null or (risk_score >= 0 and risk_score <= 1)), -- null until paired (or always null for 'reference' rows)
  pattern_match jsonb,                 -- {patternId, label, category, similarity} from lib/spectral-patterns.ts — null until paired
  created_at timestamptz not null default now()
);

-- Adds the lesion+reference pairing columns to spectral_readings if the
-- table already exists from before this protocol shipped (re-running
-- schema.sql on a live DB rather than a fresh one) — the CREATE TABLE above
-- only runs on a fresh database. Also relaxes the old NOT NULL on
-- risk_score, since 'reference' and not-yet-paired rows legitimately have
-- none — Postgres lets you drop a NOT NULL that's already satisfied
-- (existing rows all had a risk_score) without touching data.
alter table spectral_readings add column if not exists reading_type text not null default 'lesion' check (reading_type in ('lesion', 'reference'));
alter table spectral_readings add column if not exists paired_with uuid references spectral_readings(id) on delete set null;
alter table spectral_readings alter column risk_score drop not null;
alter table spectral_readings add column if not exists pattern_match jsonb;

create index photo_analyses_mole_id_idx on photo_analyses (mole_id, created_at desc);
create index spectral_readings_mole_id_idx on spectral_readings (mole_id, created_at desc);
-- Powers the pairing lookup in app/api/spectral/route.ts: "find an unpaired
-- reading of the opposite type, for this mole, within the last 5 minutes".
create index spectral_readings_pairing_idx on spectral_readings (mole_id, reading_type, created_at desc) where paired_with is null;
create index photo_analyses_risk_idx on photo_analyses (risk_score desc);

-- Lets the front-end (components/spectral-live.tsx) subscribe to new probe
-- readings over a WebSocket instead of polling. RLS still applies to
-- Realtime events, so "own spectral_readings" below still governs who sees
-- what — this only turns the channel on, it doesn't bypass row security.
alter publication supabase_realtime add table spectral_readings;

-- Single-row status for the physical probe (there's exactly one device for
-- this project — see PEN_MOLE_ID in firmware/pen-probe/pen-probe.ino).
-- Powers the "Устройство" tab. Online/offline is derived on the client from
-- last_seen_at (now() - last_seen_at < 25s) rather than stored as a boolean
-- — a stored flag would need something to flip it back to false when a
-- heartbeat simply stops arriving, which nothing here does.
create table if not exists devices (
  id text primary key default 'pen-probe',
  last_seen_at timestamptz,
  last_reading_at timestamptz,
  rssi integer,       -- WiFi signal strength (dBm), from WiFi.RSSI() in firmware
  uptime_ms bigint,   -- millis() since the ESP32 last booted — a drop to a small number between heartbeats means it rebooted (e.g. WiFi drop -> ESP.restart())
  next_reading_type text default 'lesion' check (next_reading_type in ('lesion', 'reference')) -- what the NEXT button press will send; firmware has no LED to show this itself, see pen-probe.ino
);
insert into devices (id) values ('pen-probe') on conflict (id) do nothing;

alter table devices enable row level security;
-- Read-only for logged-in users; only the service-role client (supabaseAdmin,
-- used by /api/device/heartbeat and /api/spectral) can write here — no
-- insert/update/delete policy is intentional, not an oversight.
create policy "authenticated read devices" on devices for select using (auth.role() = 'authenticated');

alter publication supabase_realtime add table devices;

-- Backs the dynamic pairing that firmware/skin-scanner-device.ino uses when
-- PEN_MOLE_ID is "auto" (see lib/probe-session.ts): app/api/probe/session
-- (POST, called when a user opens/starts a scan on a mole's page) writes a
-- row here; app/api/spectral (via resolveActiveProbeMoleId) reads the most
-- recent unexpired one to figure out which mole an incoming "auto" reading
-- belongs to. DB-backed rather than relying on the in-memory globalThis
-- fallback alone — Vercel serverless functions are ephemeral and can run as
-- multiple instances, so a process-local variable isn't reliably shared
-- between the request that sets the session and the request that reads it
-- back (see the deprecation comment in app/api/active-mole/route.ts, which
-- hit exactly this). Without this table, lib/probe-session.ts was silently
-- falling back to globalThis or "the most recently created mole" every time.
create table if not exists probe_sessions (
  id uuid primary key default gen_random_uuid(),
  mole_id uuid not null references moles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Powers "find the most recent still-valid session" in resolveActiveProbeMoleId.
create index if not exists probe_sessions_active_idx on probe_sessions (expires_at desc);

alter table probe_sessions enable row level security;
-- No policy at all is intentional, not an oversight: only supabaseAdmin
-- (service-role key, used by lib/probe-session.ts) ever reads or writes
-- this table — it's an internal device-pairing mechanism, not something a
-- user's browser session queries directly. RLS enabled with zero policies
-- means every role except service_role gets zero rows, which is exactly
-- the "nobody but the server touches this" access this table needs.

-- Row Level Security: a user only sees their own moles and the analyses hanging off them.
alter table moles enable row level security;
alter table photo_analyses enable row level security;
alter table spectral_readings enable row level security;

create policy "own moles" on moles
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "own photo_analyses" on photo_analyses
  for all using (
    exists (select 1 from moles where moles.id = photo_analyses.mole_id and moles.owner_id = auth.uid())
  ) with check (
    exists (select 1 from moles where moles.id = photo_analyses.mole_id and moles.owner_id = auth.uid())
  );

create policy "own spectral_readings" on spectral_readings
  for all using (
    exists (select 1 from moles where moles.id = spectral_readings.mole_id and moles.owner_id = auth.uid())
  ) with check (
    exists (select 1 from moles where moles.id = spectral_readings.mole_id and moles.owner_id = auth.uid())
  );

-- Doctor dashboard needs to see everyone's high-risk cases. Simplest hackathon route:
-- a `doctor` boolean on the JWT app_metadata, checked here instead of a separate roles table.
create policy "doctors see all photo_analyses" on photo_analyses
  for select using ((auth.jwt() -> 'app_metadata' ->> 'doctor')::boolean is true);

create policy "doctors see all moles" on moles
  for select using ((auth.jwt() -> 'app_metadata' ->> 'doctor')::boolean is true);

-- Storage bucket for raw photos (create once; safe to re-run).
insert into storage.buckets (id, name, public) values ('mole-photos', 'mole-photos', false)
  on conflict (id) do nothing;

create policy "own photo storage" on storage.objects
  for all using (bucket_id = 'mole-photos' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'mole-photos' and auth.uid()::text = (storage.foldername(name))[1]);

-- Optional: sweep up moles that got created but never got a photo attached
-- (e.g. mole insert in app/capture succeeded, then the storage upload or
-- classify call failed and the person gave up on retrying). The 24h
-- threshold is deliberate slack, not a guess at how long an upload takes —
-- it just needs to be comfortably longer than any real retry window so this
-- never races a person who's mid-flow. SECURITY DEFINER because RLS on
-- `moles` is owner-scoped and this needs to sweep across all owners.
create or replace function cleanup_orphan_moles() returns void
  language sql security definer set search_path = public as $$
  delete from moles
  where created_at < now() - interval '24 hours'
    and not exists (select 1 from photo_analyses where photo_analyses.mole_id = moles.id);
$$;

-- Wire it to run nightly. Requires the pg_cron extension, which on Supabase
-- is enabled per-project under Database → Extensions (not always on by
-- default) — enable it first, then run this once:
--
-- select cron.schedule('cleanup-orphan-moles', '0 3 * * *', 'select cleanup_orphan_moles();');
--
-- Without pg_cron, call select cleanup_orphan_moles(); by hand or from any
-- external scheduler that can reach the DB — the home page badge already
-- flags unfinished moles to the user in the meantime, so this is cleanup
-- hygiene rather than something the UI depends on.
