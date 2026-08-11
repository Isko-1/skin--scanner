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
create table spectral_readings (
  id uuid primary key default gen_random_uuid(),
  mole_id uuid not null references moles(id) on delete cascade,
  photo_analysis_id uuid references photo_analyses(id) on delete set null, -- links back to the scan it augments
  channels jsonb not null,             -- {"f1":.., ..., "f8":.., "clear":.., "nir":..} 11 AS7341 channels
  risk_score numeric not null check (risk_score >= 0 and risk_score <= 1),
  created_at timestamptz not null default now()
);

create index photo_analyses_mole_id_idx on photo_analyses (mole_id, created_at desc);
create index spectral_readings_mole_id_idx on spectral_readings (mole_id, created_at desc);
create index photo_analyses_risk_idx on photo_analyses (risk_score desc);

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
