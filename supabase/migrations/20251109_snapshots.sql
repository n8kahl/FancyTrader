-- Last-known-good snapshots per symbol (used for closed-market fallback)
create table if not exists public.snapshots (
  symbol text primary key,
  asof timestamptz not null,
  data jsonb not null,
  source text not null default 'massive',
  updated_at timestamptz not null default now()
);

create index if not exists snapshots_asof_idx on public.snapshots (asof desc);
comment on table public.snapshots is 'Last-known-good market snapshots per symbol';
comment on column public.snapshots.data is 'Provider-raw payload (safe to evolve)';
