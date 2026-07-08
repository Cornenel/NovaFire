-- Fix Zoho-imported jobs misclassified as Inspection / Pressure Test / Refill.
-- Run in: Supabase Dashboard → SQL Editor → New query → Run

update public.jobs
set
  job_type = 'annual_service',
  service_category = coalesce(service_category, 'Annual Fire Equipment Service')
where import_source = 'zoho_import'
  and job_type in ('inspection', 'pressure_test', 'refill');
