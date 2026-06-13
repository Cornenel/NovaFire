-- ═══════════════════════════════════════════════════════════════════════════
-- ZOHO CUSTOMER ASSET NUMBERS – ADDITIVE, BACKWARD-COMPATIBLE
--
-- PURPOSE:
--   Some Zoho portable-equipment rows use plain numbers (6, 7, 8, 12, ...)
--   as the customer's old equipment/asset number. These are not extinguisher
--   capacities and must not display as "6 DCP Fire Extinguisher".
--
-- SAFETY:
--   • Adds one nullable field: assets.customer_asset_number.
--   • Repairs imported/legacy Zoho assets only.
--   • Repairs only records confirmed as imported/legacy Zoho assets where
--     size_capacity is clearly wrong (plain digits without kg).
--   • Does not delete data. The original value is preserved in
--     legacy_description/import_raw_data and moved to customer_asset_number.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.assets
  add column if not exists customer_asset_number text;

create index if not exists assets_customer_asset_number_idx
  on public.assets (customer_asset_number);

-- Move plain numeric "capacities" from imported Zoho assets into the customer
-- asset number field. Keep real kg capacities untouched.
update public.assets
set
  customer_asset_number = coalesce(nullif(customer_asset_number, ''), size_capacity),
  size_capacity = coalesce(
    substring(coalesce(legacy_description, '') from '([0-9]+(\.[0-9]+)?[[:space:]]*kg)'),
    null
  ),
  legacy_description = coalesce(
    nullif(legacy_description, ''),
    'Zoho customer asset number ' || size_capacity
  ),
  updated_at = now()
where
  (import_source = 'zoho_import' or legacy_zoho_jobcard_id is not null)
  and size_capacity ~ '^[0-9]+$'
  and customer_asset_number is null;

-- Review list for non-imported records with similar-looking data. These are
-- intentionally NOT repaired by this migration.
--
-- select id, asset_code, customer_asset_number, size_capacity,
--        asset_medium, legacy_description, created_at, updated_at
-- from public.assets
-- where not (import_source = 'zoho_import' or legacy_zoho_jobcard_id is not null)
--   and size_capacity ~ '^[0-9]+$';
