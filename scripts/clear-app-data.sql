-- NovaFire app data reset
--
-- KEEPS: auth.users and profiles (staff / admin logins)
-- Do NOT use TRUNCATE ... CASCADE on customers/sites — that wipes profiles too.

begin;

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
  public.quote_requests,
  public.compliance_leads,
  public.training_registrations
restart identity;

-- profiles FK → sites/customers blocks TRUNCATE; DELETE is safe after unlink above
delete from public.sites;
delete from public.customers;

alter sequence if exists public.asset_code_seq restart with 1;
alter sequence if exists public.job_number_seq restart with 1;

commit;
