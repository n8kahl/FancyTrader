-- migrations/001_base_schema.sql

-- Helpers
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy if not exists profiles_self_read
  on profiles for select
  using (auth.uid() = id);

-- Trades
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('long', 'short', 'call', 'put')),
  qty numeric not null check (qty > 0),
  price numeric not null check (price > 0),
  status text not null default 'open',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table trades enable row level security;
create policy if not exists trades_owner_all
  on trades for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- Watchlists
create table if not exists watchlists (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table watchlists enable row level security;
create policy if not exists watchlists_owner_all
  on watchlists for all using (auth.uid() = owner) with check (auth.uid() = owner);

create table if not exists watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references watchlists(id) on delete cascade,
  symbol text not null,
  created_at timestamptz not null default now(),
  unique (watchlist_id, symbol)
);
alter table watchlist_items enable row level security;
create policy if not exists watchlist_items_owner_all
  on watchlist_items for all using (
    exists (
      select 1
      from watchlists w
      where w.id = watchlist_items.watchlist_id
        and w.owner = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from watchlists w
      where w.id = watchlist_items.watchlist_id
        and w.owner = auth.uid()
    )
  );

-- Alerts & Signals
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles(id) on delete cascade,
  symbol text not null,
  rule text not null,
  params jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table alerts enable row level security;
create policy if not exists alerts_owner_all
  on alerts for all using (auth.uid() = owner) with check (auth.uid() = owner);

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles(id) on delete cascade,
  symbol text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
alter table signals enable row level security;
create policy if not exists signals_owner_all
  on signals for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- Audit log
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  owner uuid references profiles(id) on delete set null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table audit_log enable row level security;
create policy if not exists audit_log_owner_write
  on audit_log for insert to authenticated
  with check (owner = auth.uid());
create policy if not exists audit_log_owner_read
  on audit_log for select
  using (owner is null or owner = auth.uid());

-- scan_jobs for worker idempotency
create table if not exists scan_jobs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  window_start timestamptz not null,
  status text not null check (status in ('pending', 'running', 'success', 'failed')),
  meta jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  unique (job_name, window_start)
);

-- Upsert helper: create profile for new users (called from the app if desired)
create or replace function ensure_profile(p_uid uuid, p_email text default null)
returns void language plpgsql as $$
begin
  insert into profiles (id, email)
  values (p_uid, p_email)
  on conflict (id) do update set email = coalesce(excluded.email, profiles.email);
end $$;
