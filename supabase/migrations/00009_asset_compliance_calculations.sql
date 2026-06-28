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
