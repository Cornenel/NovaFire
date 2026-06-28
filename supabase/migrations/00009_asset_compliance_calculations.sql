-- ASSET COMPLIANCE CALCULATIONS - ADDITIVE, BACKWARD-COMPATIBLE
--
-- PURPOSE:
--   Store calculated compliance evidence separately from raw/imported values.
--   Raw Zoho import data remains in import_raw_data and inspection checklists.
--
-- SAFETY:
--   - Nullable columns only.
--   - No existing columns renamed or removed.
--   - No existing RLS policies changed.

alter table public.assets
  add column if not exists last_pressure_test_date date,
  add column if not exists calculated_compliance_status text
    check (
      calculated_compliance_status is null
      or calculated_compliance_status in ('COMPLIANT', 'NON_COMPLIANT', 'WARNING', 'UNKNOWN')
    ),
  add column if not exists compliance_reasons jsonb not null default '[]'::jsonb,
  add column if not exists compliance_next_actions jsonb not null default '[]'::jsonb,
  add column if not exists compliance_source_fields jsonb not null default '[]'::jsonb,
  add column if not exists compliance_calculated_at timestamptz,
  add column if not exists annual_service_due_date date,
  add column if not exists pressure_test_due_date date;

create index if not exists assets_calculated_compliance_status_idx
  on public.assets (calculated_compliance_status);

create index if not exists assets_pressure_test_due_date_idx
  on public.assets (pressure_test_due_date);

create table if not exists public.asset_compliance_recheck_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete cascade,
  previous_calculated_status text,
  new_calculated_status text not null
    check (new_calculated_status in ('COMPLIANT', 'NON_COMPLIANT', 'WARNING', 'UNKNOWN')),
  raw_imported_status text,
  compliance_reasons jsonb not null default '[]'::jsonb,
  compliance_next_actions jsonb not null default '[]'::jsonb,
  calculated_at timestamptz not null,
  source_reference jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists asset_compliance_recheck_history_asset_idx
  on public.asset_compliance_recheck_history (asset_id, created_at desc);

alter table public.asset_compliance_recheck_history enable row level security;

drop policy if exists "asset_compliance_recheck_history: admin read" on public.asset_compliance_recheck_history;
drop policy if exists "asset_compliance_recheck_history: admin insert" on public.asset_compliance_recheck_history;

create policy "asset_compliance_recheck_history: admin read" on public.asset_compliance_recheck_history
  for select using (public.is_admin());

create policy "asset_compliance_recheck_history: admin insert" on public.asset_compliance_recheck_history
  for insert with check (public.is_admin());
