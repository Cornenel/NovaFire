-- NovaFire app data reset
--
-- WARNING: This deletes operational app data from public tables.
-- Run manually only against the database you intend to clear.
--
-- It keeps auth.users intact. Profiles are also kept by default because they
-- are auth-linked access records; uncomment the profiles line only for a full
-- auth/profile rebuild.

begin;

truncate table
  public.customer_update_history,
  public.import_rows,
  public.import_sessions,
  public.quote_recommendations,
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
restart identity cascade;

-- Reset hand-managed display number sequences.
alter sequence if exists public.asset_code_seq restart with 1;
alter sequence if exists public.job_number_seq restart with 1;

-- Optional full reset extras:
-- truncate table public.profiles cascade;
-- truncate table public.stock_items cascade;

commit;
