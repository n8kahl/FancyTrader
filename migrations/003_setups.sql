create table if not exists setups (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles(id) on delete cascade,
  symbol text not null,
  payload jsonb not null,
  detected_at timestamptz not null default now()
);
create index if not exists setups_owner_detected_idx on setups (owner, detected_at desc);
alter table setups enable row level security;
create policy setups_owner_all
  on setups for all
  using (auth.uid() = owner)
  with check (auth.uid() = owner);
