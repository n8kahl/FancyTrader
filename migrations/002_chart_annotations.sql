-- Chart annotations storage (entry/stop/targets per user + symbol)
create table if not exists chart_annotations (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles(id) on delete cascade,
  symbol text not null,
  entry numeric not null,
  stop numeric,
  targets numeric[] not null default '{}'::numeric[],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chart_annotations_owner_symbol_idx
  on chart_annotations (owner, symbol);

create or replace function set_updated_at_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger chart_annotations_touch
before update on chart_annotations
for each row
execute procedure set_updated_at_timestamp();

alter table chart_annotations enable row level security;

drop policy if exists chart_annotations_owner_select on chart_annotations;
create policy chart_annotations_owner_select on chart_annotations
  for select using (auth.uid() = owner);

drop policy if exists chart_annotations_owner_insert on chart_annotations;
create policy chart_annotations_owner_insert on chart_annotations
  for insert with check (auth.uid() = owner);

drop policy if exists chart_annotations_owner_update on chart_annotations;
create policy chart_annotations_owner_update on chart_annotations
  for update using (auth.uid() = owner);

drop policy if exists chart_annotations_owner_delete on chart_annotations;
create policy chart_annotations_owner_delete on chart_annotations
  for delete using (auth.uid() = owner);
