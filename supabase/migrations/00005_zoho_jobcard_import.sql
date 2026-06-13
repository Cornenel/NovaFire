-- ═══════════════════════════════════════════════════════════════════════════
-- ZOHO JOBCARD CSV IMPORT – ADDITIVE, BACKWARD-COMPATIBLE
--
-- PURPOSE:
--   Adds a safe admin import surface for legacy Zoho Jobcard CSV reports.
--
-- IMPACT:
--   • No existing tables, fields, routes, forms, policies or workflows are
--     removed, renamed or changed.
--   • Existing operational fields remain the source of truth for current app
--     workflows. New columns are nullable metadata for imported records only.
--   • Import actions use idempotency keys and create-only defaults so running
--     the same CSV twice does not duplicate imported jobs/inspections/assets.
--
-- ROLLBACK:
--   drop table if exists public.import_rows;
--   drop table if exists public.import_sessions;
--   drop indexes created below, then drop the added nullable columns if needed.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Audit/session tables ──────────────────────────────────────────────────

create table if not exists public.import_sessions (
  id uuid primary key default gen_random_uuid(),
  import_type text not null default 'zoho_jobcard',
  filename text,
  mode text not null default 'create_only'
    check (mode in ('dry_run', 'create_only')),
  status text not null default 'preview'
    check (status in ('preview', 'importing', 'completed', 'failed', 'cancelled')),
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  skipped_rows integer not null default 0,
  warning_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.import_sessions (id) on delete cascade,
  import_type text not null default 'zoho_jobcard',
  csv_row_number integer not null,
  legacy_zoho_jobcard_id text,
  equipment_section text,
  idempotency_key text not null,
  status text not null default 'preview'
    check (status in ('preview', 'imported', 'skipped', 'duplicate', 'warning', 'failed')),
  raw_data jsonb not null default '{}'::jsonb,
  mapped_data jsonb not null default '{}'::jsonb,
  import_warnings jsonb not null default '[]'::jsonb,
  customer_id uuid references public.customers (id),
  site_id uuid references public.sites (id),
  job_id uuid references public.jobs (id),
  asset_id uuid references public.assets (id),
  inspection_id uuid references public.inspections (id),
  defect_id uuid references public.defects (id),
  created_at timestamptz not null default now()
);

create index if not exists import_sessions_type_created_idx
  on public.import_sessions (import_type, created_at desc);
create index if not exists import_rows_session_idx
  on public.import_rows (session_id, csv_row_number);
create index if not exists import_rows_idempotency_key_idx
  on public.import_rows (idempotency_key);
create unique index if not exists import_rows_session_idempotency_key_idx
  on public.import_rows (session_id, idempotency_key);

-- ── Nullable legacy/import metadata columns ────────────────────────────────

alter table public.jobs
  add column if not exists legacy_zoho_jobcard_id text,
  add column if not exists import_source text,
  add column if not exists import_raw_data jsonb,
  add column if not exists import_warnings jsonb,
  add column if not exists legacy_technician_name text,
  add column if not exists legacy_technician_saqcc text,
  add column if not exists legacy_submitters_location text,
  add column if not exists next_service_due_date date;

alter table public.assets
  add column if not exists legacy_zoho_jobcard_id text,
  add column if not exists import_source text,
  add column if not exists import_raw_data jsonb,
  add column if not exists import_warnings jsonb,
  add column if not exists import_idempotency_key text,
  add column if not exists legacy_description text,
  add column if not exists imported_unverified boolean not null default false;

alter table public.inspections
  add column if not exists legacy_zoho_jobcard_id text,
  add column if not exists import_source text,
  add column if not exists import_raw_data jsonb,
  add column if not exists import_warnings jsonb,
  add column if not exists import_idempotency_key text,
  add column if not exists csv_row_number integer,
  add column if not exists legacy_technician_name text,
  add column if not exists legacy_technician_saqcc text,
  add column if not exists site_id uuid references public.sites (id),
  add column if not exists customer_id uuid references public.customers (id);

alter table public.defects
  add column if not exists legacy_zoho_jobcard_id text,
  add column if not exists import_source text,
  add column if not exists import_raw_data jsonb,
  add column if not exists import_warnings jsonb,
  add column if not exists import_idempotency_key text,
  add column if not exists csv_row_number integer,
  add column if not exists legacy_technician_name text,
  add column if not exists legacy_technician_saqcc text;

create unique index if not exists jobs_zoho_jobcard_unique_idx
  on public.jobs (legacy_zoho_jobcard_id)
  where import_source = 'zoho_import' and legacy_zoho_jobcard_id is not null;

create unique index if not exists assets_zoho_import_key_unique_idx
  on public.assets (import_idempotency_key)
  where import_source = 'zoho_import' and import_idempotency_key is not null;

create unique index if not exists inspections_zoho_import_key_unique_idx
  on public.inspections (import_idempotency_key)
  where import_source = 'zoho_import' and import_idempotency_key is not null;

create unique index if not exists defects_zoho_import_key_unique_idx
  on public.defects (import_idempotency_key)
  where import_source = 'zoho_import' and import_idempotency_key is not null;

-- ── RLS for audit tables (existing tables' policies are untouched) ─────────

alter table public.import_sessions enable row level security;
alter table public.import_rows enable row level security;

create policy "import_sessions: dispatcher read" on public.import_sessions
  for select using (public.is_dispatcher());
create policy "import_sessions: dispatcher insert" on public.import_sessions
  for insert with check (public.is_dispatcher());
create policy "import_sessions: dispatcher update" on public.import_sessions
  for update using (public.is_dispatcher()) with check (public.is_dispatcher());

create policy "import_rows: dispatcher read" on public.import_rows
  for select using (public.is_dispatcher());
create policy "import_rows: dispatcher insert" on public.import_rows
  for insert with check (public.is_dispatcher());
create policy "import_rows: dispatcher update" on public.import_rows
  for update using (public.is_dispatcher()) with check (public.is_dispatcher());
