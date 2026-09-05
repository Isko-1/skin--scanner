-- Migration: add lesion+reference pairing columns to spectral_readings
-- Run once in Supabase SQL editor: Database → SQL Editor → New query
-- Safe to re-run: all statements use IF NOT EXISTS / IF EXISTS guards.

-- 1. New columns (IF NOT EXISTS = safe to re-run)
alter table spectral_readings
  add column if not exists reading_type text
    not null default 'lesion'
    check (reading_type in ('lesion', 'reference'));

alter table spectral_readings
  add column if not exists paired_with uuid
    references spectral_readings(id) on delete set null;

alter table spectral_readings
  add column if not exists pattern_match jsonb;

-- 2. risk_score was NOT NULL in the old schema; 'reference' rows and
--    not-yet-paired lesion rows legitimately have no score yet.
alter table spectral_readings
  alter column risk_score drop not null;

-- 3. Index that powers the 5-minute pairing window lookup in
--    app/api/spectral/route.ts — partial index, only unpaired rows.
create index if not exists spectral_readings_pairing_idx
  on spectral_readings (mole_id, reading_type, created_at desc)
  where paired_with is null;

-- 4. Notify PostgREST to reload its schema cache so the new columns
--    appear immediately (no restart needed).
notify pgrst, 'reload schema';
