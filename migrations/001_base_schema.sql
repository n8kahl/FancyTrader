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

-- Trades
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('BUY','SELL')),
  entry numeric not null,
  qty integer not null default 1,
  stop numeric,
  targets numeric[] default '{}',
  notes text,
  status text not null default 'OPEN' check (status in ('OPEN','CLOSED','CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trades_owner_idx on trades(owner);
alter table trades enable row level security;

-- Watchlists
create table if not exists watchlists (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles(id) on delete cascade,
  name text not null default 'Default',
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);
alter table watchlists enable row level security;

create table if not exists watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references watchlists(id) on delete cascade,
  symbol text not null,
  created_at timestamptz not null default now(),
  unique (watchlist_id, symbol)
);
alter table watchlist_items enable row level security;

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

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles(id) on delete cascade,
  symbol text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
alter table signals enable row level security;

-- Audit log
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  owner uuid references profiles(id) on delete set null,
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table audit_log enable row level security;

-- RLS: owner-only policies
create policy if not exists "profiles_self_read"
  on profiles for select
  using (auth.uid() = id);

create policy if not exists "trades_owner_all"
  on trades for all
  using (auth.uid() = owner)
  with check (auth.uid() = owner);

create policy if not exists "watchlists_owner_all"
  on watchlists for all
  using (auth.uid() = owner)
  with check (auth.uid() = owner);

create policy if not exists "watchlist_items_through_watchlist"
  on watchlist_items for all
  using (exists (select 1 from watchlists w where w.id = watchlist_items.watchlist_id and w.owner = auth.uid()))
  with check (exists (select 1 from watchlists w where w.id = watchlist_items.watchlist_id and w.owner = auth.uid()));

create policy if not exists "alerts_owner_all"
  on alerts for all
  using (auth.uid() = owner)
  with check (auth.uid() = owner);

create policy if not exists "signals_owner_all"
  on signals for all
  using (auth.uid() = owner)
  with check (auth.uid() = owner);

create policy if not exists "audit_log_owner_read"
  on audit_log for select
  using (owner is null or owner = auth.uid());

-- Upsert helper: create profile for new users (called from the app if desired)
create or replace function ensure_profile(p_uid uuid, p_email text default null)
returns void language plpgsql as $$
begin
  insert into profiles (id, email)
  values (p_uid, p_email)
  on conflict (id) do update set email = coalesce(excluded.email, profiles.email);
end $$;
