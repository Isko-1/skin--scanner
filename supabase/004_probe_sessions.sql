-- Migration: add probe_sessions table for dynamic pairing without reflashing
-- Safe to re-run: uses IF NOT EXISTS guards.

create table if not exists probe_sessions (
  id uuid primary key default gen_random_uuid(),
  mole_id uuid not null references moles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Index for instant lookup of the active session
create index if not exists probe_sessions_active_idx
  on probe_sessions (expires_at desc, created_at desc);

-- RLS
alter table probe_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'probe_sessions' and policyname = 'Users can manage own probe sessions'
  ) then
    create policy "Users can manage own probe sessions"
      on probe_sessions for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

notify pgrst, 'reload schema';
