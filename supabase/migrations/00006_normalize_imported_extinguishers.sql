-- ═══════════════════════════════════════════════════════════════════════════
-- NORMALIZE IMPORTED FIRE EXTINGUISHERS – ADDITIVE, BACKWARD-COMPATIBLE
--
-- PURPOSE:
--   Old Zoho values like "DCP Unit" / "CO2 Unit" are mediums, not top-level
--   asset types. Imported extinguishers should be:
--     asset_type   = fire_extinguisher
--     asset_medium = DCP / CO2 / ...
--     size_capacity = 9kg / 4.5kg / ...
--
-- SAFETY:
--   • Does not drop or rename enum values, columns, tables, routes or policies.
--   • Adds one nullable field: assets.asset_medium.
--   • Repairs imported/legacy assets only.
--   • Skips likely manually edited records by only updating rows whose
--     updated_at is still within 10 minutes of created_at (typical import
--     window). Review skipped rows with the SELECT at the bottom.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.assets
  add column if not exists asset_medium text;

create index if not exists assets_asset_medium_idx
  on public.assets (asset_medium);

-- Normalize imported DCP/CO2 pseudo-types to Fire Extinguisher.
update public.assets
set
  legacy_description = coalesce(
    nullif(legacy_description, ''),
    case
      when asset_type = 'dcp_unit'::public.asset_type then 'DCP Unit'
      when asset_type = 'co2_unit'::public.asset_type then 'CO2 Unit'
      else legacy_description
    end
  ),
  asset_medium = coalesce(
    nullif(asset_medium, ''),
    case
      when asset_type = 'dcp_unit'::public.asset_type then 'DCP'
      when asset_type = 'co2_unit'::public.asset_type then 'CO2'
      when coalesce(legacy_description, '') ilike '%DCP%' then 'DCP'
      when coalesce(legacy_description, '') ilike '%CO2%' then 'CO2'
      else asset_medium
    end
  ),
  size_capacity = coalesce(
    nullif(size_capacity, ''),
    substring(coalesce(legacy_description, '') from '([0-9]+(\.[0-9]+)?[[:space:]]*kg)')
  ),
  asset_type = 'fire_extinguisher'::public.asset_type,
  updated_at = now()
where
  (import_source = 'zoho_import' or legacy_zoho_jobcard_id is not null)
  and asset_type in ('dcp_unit'::public.asset_type, 'co2_unit'::public.asset_type)
  and updated_at <= created_at + interval '10 minutes';

-- Enrich imported Fire Extinguishers where the legacy description contains
-- capacity/medium but the normalized fields are blank.
update public.assets
set
  asset_medium = coalesce(
    nullif(asset_medium, ''),
    case
      when coalesce(legacy_description, '') ilike '%DCP%' then 'DCP'
      when coalesce(legacy_description, '') ilike '%CO2%' then 'CO2'
      when coalesce(legacy_description, '') ilike '%foam%' then 'Foam'
      when coalesce(legacy_description, '') ilike '%water%' then 'Water'
      when coalesce(legacy_description, '') ilike '%wet chemical%' then 'Wet Chemical'
      else asset_medium
    end
  ),
  size_capacity = coalesce(
    nullif(size_capacity, ''),
    substring(coalesce(legacy_description, '') from '([0-9]+(\.[0-9]+)?[[:space:]]*kg)')
  ),
  updated_at = now()
where
  (import_source = 'zoho_import' or legacy_zoho_jobcard_id is not null)
  and asset_type = 'fire_extinguisher'::public.asset_type
  and updated_at <= created_at + interval '10 minutes';

-- Review list for imported extinguisher-like records skipped as likely manual
-- edits. Run manually if you want to inspect before deciding on any update.
--
-- select id, asset_code, asset_type, asset_medium, size_capacity,
--        location_description, legacy_description, created_at, updated_at
-- from public.assets
-- where (import_source = 'zoho_import' or legacy_zoho_jobcard_id is not null)
--   and asset_type in ('dcp_unit'::public.asset_type, 'co2_unit'::public.asset_type)
--   and updated_at > created_at + interval '10 minutes';
