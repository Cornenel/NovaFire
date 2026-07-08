-- Apply Zoho import schema changes (migration 00012_quote_groups.sql)
--
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- Fixes errors like:
--   Could not find the 'service_category' column of 'jobs' in the schema cache
--   relation "quote_groups" does not exist
--
-- Safe to re-run: uses IF NOT EXISTS throughout.

begin;

create table if not exists public.quote_groups (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  quote_group_key text not null,
  quote_type text not null,
  quote_group_scope text not null default 'Jobcard',
  status text not null default 'quote_required'
    check (status in ('quote_required', 'draft', 'sent', 'accepted', 'dismissed')),
  source text,
  reason text,
  total_assets integer not null default 0,
  import_source text,
  legacy_zoho_jobcard_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quote_groups_key_unique_idx
  on public.quote_groups (quote_group_key);

create index if not exists quote_groups_job_idx
  on public.quote_groups (job_id);

create table if not exists public.quote_group_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_group_id uuid not null references public.quote_groups (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  defect_id uuid references public.defects (id) on delete set null,
  description text not null,
  quantity integer not null default 1,
  import_idempotency_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists quote_group_line_items_import_key_unique_idx
  on public.quote_group_line_items (import_idempotency_key)
  where import_idempotency_key is not null;

create index if not exists quote_group_line_items_group_idx
  on public.quote_group_line_items (quote_group_id);

alter table public.defects
  add column if not exists quote_group_id uuid references public.quote_groups (id) on delete set null;

alter table public.jobs
  add column if not exists service_category text;

drop trigger if exists set_updated_at on public.quote_groups;
create trigger set_updated_at before update on public.quote_groups
  for each row execute function public.set_updated_at();

alter table public.quote_groups enable row level security;
alter table public.quote_group_line_items enable row level security;

drop policy if exists "quote_groups: staff read" on public.quote_groups;
create policy "quote_groups: staff read" on public.quote_groups
  for select using (public.is_staff());

drop policy if exists "quote_groups: dispatcher write" on public.quote_groups;
create policy "quote_groups: dispatcher write" on public.quote_groups
  for all using (public.is_dispatcher()) with check (public.is_dispatcher());

drop policy if exists "quote_group_line_items: staff read" on public.quote_group_line_items;
create policy "quote_group_line_items: staff read" on public.quote_group_line_items
  for select using (public.is_staff());

drop policy if exists "quote_group_line_items: dispatcher write" on public.quote_group_line_items;
create policy "quote_group_line_items: dispatcher write" on public.quote_group_line_items
  for all using (public.is_dispatcher()) with check (public.is_dispatcher());

commit;

-- Correct job type for historical Zoho imports misclassified before annual-service rules.
update public.jobs
set
  job_type = 'annual_service',
  service_category = coalesce(service_category, 'Annual Fire Equipment Service')
where import_source = 'zoho_import'
  and job_type in ('inspection', 'pressure_test', 'refill');

-- After running: wait a few seconds for PostgREST schema cache to refresh, then retry the import.
