-- Performance indexes for common access paths
create index if not exists trades_owner_created_idx on trades (owner, created_at desc);
create index if not exists trades_symbol_created_idx on trades (symbol, created_at desc);
create index if not exists watchlist_items_watchlist_symbol_idx on watchlist_items (watchlist_id, symbol);
create index if not exists alerts_owner_active_idx on alerts (owner, active);
create index if not exists alerts_symbol_owner_idx on alerts (symbol, owner);
create index if not exists setups_owner_detected_idx on setups (owner, detected_at desc);
create index if not exists audit_log_owner_created_idx on audit_log (owner, created_at desc);
create index if not exists scan_jobs_status_idx on scan_jobs (status, window_start desc);
