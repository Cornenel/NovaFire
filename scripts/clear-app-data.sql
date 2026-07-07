-- NovaFire app data reset
--
-- WARNING: Deletes operational app data from public tables.
-- Run manually only against the database you intend to clear.
--
-- KEEPS: auth.users and profiles (staff / admin logins)
--
-- IMPORTANT: Do NOT use TRUNCATE ... CASCADE on customers/sites while profiles
-- references those tables — PostgreSQL will wipe the entire profiles table.
-- Unlink portal users first, then truncate WITHOUT CASCADE.

begin;

-- Unlink portal client users from customers/sites (required before truncate)
update public.profiles
set customer_id = null,
    portal_site_id = null,
    last_portal_login_at = null
where customer_id is not null
   or portal_site_id is not null;

truncate table
  public.asset_compliance_recheck_history,
  public.customer_update_history,
  public.import_rows,
  public.import_sessions,
  public.quote_recommendations,
  public.fire_risks,
  public.reports,
  public.signatures,
  public.photos,
  public.stock_usage,
  public.van_stock,
  public.defects,
  public.inspections,
  public.asset_events,
  public.jobs,
  public.assets,
  public.sites,
  public.customers,
  public.quote_requests,
  public.compliance_leads,
  public.training_registrations
restart identity;

-- Reset hand-managed display number sequences.
alter sequence if exists public.asset_code_seq restart with 1;
alter sequence if exists public.job_number_seq restart with 1;

-- Optional full reset extras (also removes staff access records):
-- truncate table public.profiles cascade;
-- truncate table public.stock_items cascade;

commit;
