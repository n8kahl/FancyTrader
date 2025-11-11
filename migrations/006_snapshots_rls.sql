-- Enable RLS on snapshots and allow reads to anon/auth; writes via service_role only
alter table if exists public.snapshots enable row level security;

do $$ begin
  create policy if not exists snapshots_read
    on public.snapshots for select
    to anon, authenticated
    using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy if not exists snapshots_write_service
    on public.snapshots for all
    to service_role
    using (true)
    with check (true);
exception when duplicate_object then null; end $$;

create index if not exists snapshots_asof_idx on public.snapshots (asof desc);
