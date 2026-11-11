-- ZOHO BOOKS INTEGRATION — ADDITIVE ONLY
--
-- Does not rename, drop, or rewrite customers, sites, assets, jobs,
-- inspections, defects, quotes, portal permissions, or Zoho Forms imports.
-- Customer updates remain ordinary UPDATEs on public.customers so existing
-- UUIDs and foreign keys stay intact. customer_update_history (00008) records
-- those updates.
--
-- Token ciphertext is stored in zoho_books_token_secrets and zoho_oauth_states.
-- Those tables have RLS enabled and no grants for anon or authenticated.
-- Only the service role, used by server code after an active-admin check,
-- can read or write them.
--
-- Financial document links cannot enable writes:
--   financial_writes_enabled must stay false.
--
-- APPLY MANUALLY (do not run against production until the owner authorises it):
--   supabase db push
--   or run this file in the Supabase SQL editor for the target project.
-- This migration inserts no customer or token data.

-- ── Connection status (no secrets) ─────────────────────────────────────────

create table if not exists public.zoho_books_connections (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true,
  status text not null default 'pending_organization'
    check (status in ('pending_organization', 'connected', 'revoked', 'error')),
  accounts_url text not null,
  api_domain text,
  organization_id text,
  organization_name text,
  scopes text not null,
  connected_by uuid references public.profiles (id),
  connected_at timestamptz,
  last_connection_test_at timestamptz,
  last_connection_test_ok boolean,
  last_error_code text,
  last_error_message text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zoho_books_connections_singleton unique (singleton),
  constraint zoho_books_connections_error_len check (
    last_error_message is null or char_length(last_error_message) <= 300
  )
);

create table if not exists public.zoho_books_organizations (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.zoho_books_connections (id) on delete cascade,
  organization_id text not null,
  name text not null,
  currency_code text,
  is_default_org boolean not null default false,
  created_at timestamptz not null default now(),
  unique (connection_id, organization_id)
);

-- ── Secrets: service role only ─────────────────────────────────────────────

create table if not exists public.zoho_books_token_secrets (
  connection_id uuid primary key references public.zoho_books_connections (id) on delete cascade,
  access_token_ciphertext text,
  access_token_expires_at timestamptz,
  refresh_token_ciphertext text,
  token_version integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint zoho_books_token_version_positive check (token_version > 0)
);

create table if not exists public.zoho_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  admin_user_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists zoho_oauth_states_expires_idx
  on public.zoho_oauth_states (expires_at);

-- ── Customer mappings ──────────────────────────────────────────────────────

create table if not exists public.zoho_books_contact_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  zoho_contact_id text not null,
  customer_id uuid not null references public.customers (id) on delete restrict,
  match_method text not null,
  match_status text not null default 'verified'
    check (match_status in ('verified', 'rejected')),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, zoho_contact_id)
);

create index if not exists zoho_books_contact_mappings_customer_idx
  on public.zoho_books_contact_mappings (customer_id);

-- ── Sync runs and review items ─────────────────────────────────────────────

create table if not exists public.zoho_books_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  mode text not null check (mode in ('dry_run', 'apply')),
  status text not null check (status in ('running', 'awaiting_review', 'completed', 'failed')),
  started_by uuid references public.profiles (id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  constraint zoho_books_sync_error_len check (
    error_message is null or char_length(error_message) <= 300
  )
);

create unique index if not exists zoho_books_one_running_sync
  on public.zoho_books_sync_runs (organization_id)
  where status = 'running';

create index if not exists zoho_books_sync_runs_started_idx
  on public.zoho_books_sync_runs (organization_id, started_at desc);

create table if not exists public.zoho_books_sync_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.zoho_books_sync_runs (id) on delete cascade,
  organization_id text not null,
  zoho_contact_id text not null,
  zoho_display_name text not null,
  customer_id uuid references public.customers (id) on delete restrict,
  customer_name_snapshot text,
  category text not null check (category in (
    'verified_match',
    'needs_review',
    'unmatched',
    'conflict'
  )),
  match_method text,
  confidence text,
  candidates jsonb not null default '[]'::jsonb,
  proposed_changes jsonb not null default '[]'::jsonb,
  zoho_snapshot jsonb not null default '{}'::jsonb,
  decision text not null default 'pending' check (decision in (
    'pending',
    'approve_update',
    'link',
    'create_customer',
    'skip',
    'reject'
  )),
  decision_customer_id uuid references public.customers (id) on delete restrict,
  apply_conflicts boolean not null default false,
  confirm_distinct boolean not null default false,
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  apply_status text check (apply_status in ('applied', 'failed', 'skipped')),
  apply_error text,
  created_at timestamptz not null default now(),
  unique (run_id, zoho_contact_id),
  constraint zoho_books_sync_apply_error_len check (
    apply_error is null or char_length(apply_error) <= 300
  )
);

create index if not exists zoho_books_sync_items_run_category_idx
  on public.zoho_books_sync_items (run_id, category);

-- ── Audit (no credentials) ─────────────────────────────────────────────────

create table if not exists public.zoho_books_audit_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.zoho_books_sync_runs (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  organization_id text,
  zoho_contact_id text,
  event_type text not null,
  match_method text,
  review_status text,
  fields_changed jsonb not null default '[]'::jsonb,
  previous_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  actor_id uuid references public.profiles (id),
  success boolean not null,
  message text,
  created_at timestamptz not null default now(),
  constraint zoho_books_audit_message_len check (
    message is null or char_length(message) <= 300
  )
);

create index if not exists zoho_books_audit_customer_idx
  on public.zoho_books_audit_events (customer_id, created_at desc);

create index if not exists zoho_books_audit_run_idx
  on public.zoho_books_audit_events (run_id, created_at desc);

-- ── Read-only financial document index for a later authorised phase ───────

create table if not exists public.zoho_books_document_links (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  document_type text not null check (document_type in ('item', 'estimate', 'invoice')),
  zoho_document_id text not null,
  document_number text,
  document_status text,
  document_date date,
  zoho_contact_id text,
  contact_name text,
  customer_id uuid references public.customers (id) on delete set null,
  quote_recommendation_id uuid references public.quote_recommendations (id) on delete set null,
  currency_code text,
  total numeric,
  financial_writes_enabled boolean not null default false,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, document_type, zoho_document_id),
  constraint zoho_books_document_writes_disabled check (financial_writes_enabled = false)
);

create index if not exists zoho_books_document_links_customer_idx
  on public.zoho_books_document_links (customer_id)
  where customer_id is not null;

-- ── Triggers ───────────────────────────────────────────────────────────────

drop trigger if exists set_updated_at on public.zoho_books_connections;
create trigger set_updated_at before update on public.zoho_books_connections
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.zoho_books_contact_mappings;
create trigger set_updated_at before update on public.zoho_books_contact_mappings
  for each row execute function public.set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table public.zoho_books_connections enable row level security;
alter table public.zoho_books_organizations enable row level security;
alter table public.zoho_books_token_secrets enable row level security;
alter table public.zoho_oauth_states enable row level security;
alter table public.zoho_books_contact_mappings enable row level security;
alter table public.zoho_books_sync_runs enable row level security;
alter table public.zoho_books_sync_items enable row level security;
alter table public.zoho_books_audit_events enable row level security;
alter table public.zoho_books_document_links enable row level security;

drop policy if exists "zoho books connections: admin read" on public.zoho_books_connections;
create policy "zoho books connections: admin read" on public.zoho_books_connections
  for select using (public.is_admin());

drop policy if exists "zoho books organizations: admin read" on public.zoho_books_organizations;
create policy "zoho books organizations: admin read" on public.zoho_books_organizations
  for select using (public.is_admin());

drop policy if exists "zoho books mappings: admin read" on public.zoho_books_contact_mappings;
create policy "zoho books mappings: admin read" on public.zoho_books_contact_mappings
  for select using (public.is_admin());

drop policy if exists "zoho books sync runs: admin read" on public.zoho_books_sync_runs;
create policy "zoho books sync runs: admin read" on public.zoho_books_sync_runs
  for select using (public.is_admin());

drop policy if exists "zoho books sync items: admin read" on public.zoho_books_sync_items;
create policy "zoho books sync items: admin read" on public.zoho_books_sync_items
  for select using (public.is_admin());

drop policy if exists "zoho books audit: admin read" on public.zoho_books_audit_events;
create policy "zoho books audit: admin read" on public.zoho_books_audit_events
  for select using (public.is_admin());

drop policy if exists "zoho books documents: admin read" on public.zoho_books_document_links;
create policy "zoho books documents: admin read" on public.zoho_books_document_links
  for select using (public.is_admin());

-- No policies on token or OAuth-state tables: authenticated users cannot read them.

revoke all on table public.zoho_books_connections from public, anon, authenticated;
revoke all on table public.zoho_books_organizations from public, anon, authenticated;
revoke all on table public.zoho_books_token_secrets from public, anon, authenticated;
revoke all on table public.zoho_oauth_states from public, anon, authenticated;
revoke all on table public.zoho_books_contact_mappings from public, anon, authenticated;
revoke all on table public.zoho_books_sync_runs from public, anon, authenticated;
revoke all on table public.zoho_books_sync_items from public, anon, authenticated;
revoke all on table public.zoho_books_audit_events from public, anon, authenticated;
revoke all on table public.zoho_books_document_links from public, anon, authenticated;

grant select on table public.zoho_books_connections to authenticated;
grant select on table public.zoho_books_organizations to authenticated;
grant select on table public.zoho_books_contact_mappings to authenticated;
grant select on table public.zoho_books_sync_runs to authenticated;
grant select on table public.zoho_books_sync_items to authenticated;
grant select on table public.zoho_books_audit_events to authenticated;
grant select on table public.zoho_books_document_links to authenticated;

grant all on table public.zoho_books_connections to service_role;
grant all on table public.zoho_books_organizations to service_role;
grant all on table public.zoho_books_token_secrets to service_role;
grant all on table public.zoho_oauth_states to service_role;
grant all on table public.zoho_books_contact_mappings to service_role;
grant all on table public.zoho_books_sync_runs to service_role;
grant all on table public.zoho_books_sync_items to service_role;
grant all on table public.zoho_books_audit_events to service_role;
grant all on table public.zoho_books_document_links to service_role;
