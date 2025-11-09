create table if not exists scan_jobs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  window_start timestamptz not null,
  status text not null check (status in ('pending','running','success','failed')),
  attempt int not null default 0,
  meta jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz
);
create unique index if not exists scan_jobs_unique on scan_jobs (job_name, window_start);
alter table scan_jobs enable row level security;
create policy scan_jobs_service_only
  on scan_jobs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
