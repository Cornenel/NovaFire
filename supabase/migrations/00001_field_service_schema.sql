-- ═══════════════════════════════════════════════════════════════════════════
-- NOVA FIRE – FIELD SERVICE MANAGEMENT SCHEMA
-- Asset-based fire protection system: every job, inspection, defect, photo,
-- signature and stock movement connects back to individual fire assets.
--
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ───────────────────────────────────────────────────────────────────────────

create type public.user_role as enum ('client', 'technician', 'dispatcher', 'admin');

create type public.job_status as enum (
  'not_started', 'travelling', 'on_site', 'completed', 'awaiting_parts', 'cancelled'
);

create type public.job_priority as enum ('low', 'medium', 'high', 'emergency');

create type public.job_type as enum (
  'annual_service', 'inspection', 'installation', 'repair', 'callout', 'refill', 'pressure_test'
);

create type public.asset_type as enum (
  'fire_extinguisher', 'hose_reel', 'hydrant', 'fire_blanket',
  'signage', 'fire_detection', 'co2_unit', 'dcp_unit'
);

create type public.asset_status as enum (
  'compliant', 'defective', 'removed', 'replaced', 'missing'
);

create type public.defect_severity as enum ('low', 'medium', 'high', 'critical');

create type public.defect_status as enum ('open', 'quote_sent', 'in_progress', 'resolved', 'closed');

create type public.inspection_result as enum ('pass', 'fail');

create type public.photo_stage as enum ('before', 'after', 'general', 'defect');

create type public.asset_event_type as enum (
  'installed', 'inspected', 'defect_reported', 'refilled', 'replaced',
  'removed', 'marked_missing', 'status_changed', 'serviced'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. PROFILES & ROLES
-- ───────────────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.user_role not null default 'client',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup. @novafire.co.za → technician, else client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when new.email ilike '%@novafire.co.za' then 'technician'::public.user_role
      else 'client'::public.user_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helper functions (security definer avoids recursive RLS on profiles)
create or replace function public.current_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_role() in ('technician', 'dispatcher', 'admin');
$$;

create or replace function public.is_dispatcher()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_role() in ('dispatcher', 'admin');
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_role() = 'admin';
$$;

-- Block self-service role escalation
create or replace function public.enforce_role_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.enforce_role_change();

-- ───────────────────────────────────────────────────────────────────────────
-- 3. CUSTOMERS & SITES
-- ───────────────────────────────────────────────────────────────────────────

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  email text,
  phone text,
  billing_address text,
  vat_number text,
  is_sla_client boolean not null default false,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  address text not null,
  latitude double precision,
  longitude double precision,
  contact_person text,
  contact_phone text,
  access_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sites_customer_idx on public.sites (customer_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. ASSET REGISTER
-- ───────────────────────────────────────────────────────────────────────────

create sequence public.asset_code_seq;

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  -- Human-readable ID printed on the physical label, e.g. NF-A-00042
  asset_code text not null unique
    default 'NF-A-' || lpad(nextval('public.asset_code_seq')::text, 5, '0'),
  -- Token encoded in the QR code; scanning resolves this to the asset
  qr_token uuid not null unique default gen_random_uuid(),
  asset_type public.asset_type not null,
  size_capacity text,                -- e.g. "9kg", "4.5kg", "30m"
  serial_number text,
  location_description text,         -- e.g. "Kitchen, next to back door"
  manufacture_date date,
  last_service_date date,
  next_service_date date,
  status public.asset_status not null default 'compliant',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assets_site_idx on public.assets (site_id);
create index assets_next_service_idx on public.assets (next_service_date);
create index assets_status_idx on public.assets (status);

-- Immutable audit trail: everything that ever happened to an asset
create table public.asset_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete cascade,
  job_id uuid,                       -- fk added after jobs table
  technician_id uuid references public.profiles (id),
  event_type public.asset_event_type not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index asset_events_asset_idx on public.asset_events (asset_id, created_at desc);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. JOBS
-- ───────────────────────────────────────────────────────────────────────────

create sequence public.job_number_seq;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_number text not null unique
    default 'JOB-' || lpad(nextval('public.job_number_seq')::text, 6, '0'),
  customer_id uuid not null references public.customers (id),
  site_id uuid not null references public.sites (id),
  assigned_to uuid references public.profiles (id),
  created_by uuid references public.profiles (id),
  job_type public.job_type not null default 'annual_service',
  priority public.job_priority not null default 'medium',
  status public.job_status not null default 'not_started',
  scheduled_date date not null default current_date,
  description text,
  contact_person text,
  contact_phone text,
  -- Workflow timestamps & GPS
  travel_started_at timestamptz,
  checked_in_at timestamptz,
  checkin_latitude double precision,
  checkin_longitude double precision,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_assigned_date_idx on public.jobs (assigned_to, scheduled_date);
create index jobs_status_idx on public.jobs (status);
create index jobs_site_idx on public.jobs (site_id);

alter table public.asset_events
  add constraint asset_events_job_fk
  foreign key (job_id) references public.jobs (id) on delete set null;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. INSPECTIONS (checklists stored as jsonb – per asset type templates
--    live in the app; results connect job ↔ asset ↔ technician)
-- ───────────────────────────────────────────────────────────────────────────

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  technician_id uuid not null references public.profiles (id),
  asset_type public.asset_type not null,
  -- e.g. {"accessible": true, "pressure_gauge_ok": false, ...}
  checklist jsonb not null default '{}'::jsonb,
  result public.inspection_result not null,
  requires_refill boolean not null default false,
  requires_pressure_test boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index inspections_job_idx on public.inspections (job_id);
create index inspections_asset_idx on public.inspections (asset_id, created_at desc);

-- ───────────────────────────────────────────────────────────────────────────
-- 7. DEFECTS
-- ───────────────────────────────────────────────────────────────────────────

create table public.defects (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  technician_id uuid not null references public.profiles (id),
  defect_type text not null,         -- e.g. "Pressure loss", "Corrosion", "Missing signage"
  severity public.defect_severity not null default 'medium',
  description text not null,
  recommended_action text,
  quote_required boolean not null default false,
  status public.defect_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index defects_job_idx on public.defects (job_id);
create index defects_asset_idx on public.defects (asset_id);
create index defects_status_idx on public.defects (status);

-- ───────────────────────────────────────────────────────────────────────────
-- 8. PHOTO EVIDENCE (Supabase Storage bucket: job-photos)
-- ───────────────────────────────────────────────────────────────────────────

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  asset_id uuid references public.assets (id) on delete set null,
  defect_id uuid references public.defects (id) on delete set null,
  inspection_id uuid references public.inspections (id) on delete set null,
  technician_id uuid not null references public.profiles (id),
  storage_path text not null,        -- path inside the job-photos bucket
  stage public.photo_stage not null default 'general',
  latitude double precision,
  longitude double precision,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index photos_job_idx on public.photos (job_id);
create index photos_asset_idx on public.photos (asset_id);
create index photos_defect_idx on public.photos (defect_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 9. CUSTOMER SIGNATURES (Supabase Storage bucket: signatures)
-- ───────────────────────────────────────────────────────────────────────────

create table public.signatures (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs (id) on delete cascade,
  signer_name text not null,
  signer_title text,
  storage_path text not null,        -- signature PNG in the signatures bucket
  latitude double precision,
  longitude double precision,
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────────
-- 10. VAN STOCK
-- ───────────────────────────────────────────────────────────────────────────

create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null default 'general',
  unit text not null default 'unit',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.van_stock (
  technician_id uuid not null references public.profiles (id) on delete cascade,
  stock_item_id uuid not null references public.stock_items (id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (technician_id, stock_item_id)
);

create table public.stock_usage (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  technician_id uuid not null references public.profiles (id),
  stock_item_id uuid not null references public.stock_items (id),
  asset_id uuid references public.assets (id) on delete set null,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index stock_usage_job_idx on public.stock_usage (job_id);
create index stock_usage_tech_idx on public.stock_usage (technician_id, created_at desc);

-- Using stock automatically reduces van stock (fails if insufficient)
create or replace function public.apply_stock_usage()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.van_stock
  set quantity = quantity - new.quantity,
      updated_at = now()
  where technician_id = new.technician_id
    and stock_item_id = new.stock_item_id;

  if not found then
    raise exception 'No van stock record for this technician and item';
  end if;

  return new;
end;
$$;

create trigger stock_usage_decrement
  after insert on public.stock_usage
  for each row execute function public.apply_stock_usage();

-- Default stock item catalog
insert into public.stock_items (name, category) values
  ('9kg DCP Extinguisher', 'extinguisher'),
  ('4.5kg DCP Extinguisher', 'extinguisher'),
  ('5kg CO2 Extinguisher', 'extinguisher'),
  ('2kg CO2 Extinguisher', 'extinguisher'),
  ('Fire Blanket', 'equipment'),
  ('Fire Signage', 'signage'),
  ('Hose Reel Parts', 'parts'),
  ('Nozzle', 'parts'),
  ('Seal', 'consumable'),
  ('Safety Pin', 'consumable');

-- ───────────────────────────────────────────────────────────────────────────
-- 11. REPORTS (generated PDFs – Supabase Storage bucket: reports)
-- ───────────────────────────────────────────────────────────────────────────

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  report_type text not null check (
    report_type in ('service_report', 'inspection_report', 'defect_report', 'certificate')
  ),
  storage_path text not null,
  generated_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index reports_job_idx on public.reports (job_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 12. WEBSITE LEAD TABLES (public marketing forms – inserted via server
--     actions using the service role, read by dispatchers/admins)
-- ───────────────────────────────────────────────────────────────────────────

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text not null,
  phone text,
  service_interest text,
  message text,
  created_at timestamptz not null default now()
);

create table public.compliance_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text not null,
  phone text,
  answers jsonb not null default '{}'::jsonb,
  score integer,
  created_at timestamptz not null default now()
);

create table public.training_registrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text not null,
  phone text,
  course text,
  attendees integer not null default 1,
  preferred_date date,
  message text,
  created_at timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────────
-- 13. updated_at TRIGGERS
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.sites
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.assets
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.defects
  for each row execute function public.set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- 14. ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.sites enable row level security;
alter table public.assets enable row level security;
alter table public.asset_events enable row level security;
alter table public.jobs enable row level security;
alter table public.inspections enable row level security;
alter table public.defects enable row level security;
alter table public.photos enable row level security;
alter table public.signatures enable row level security;
alter table public.stock_items enable row level security;
alter table public.van_stock enable row level security;
alter table public.stock_usage enable row level security;
alter table public.reports enable row level security;
alter table public.quote_requests enable row level security;
alter table public.compliance_leads enable row level security;
alter table public.training_registrations enable row level security;

-- profiles
create policy "profiles: read own or staff" on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- customers / sites: staff read, dispatcher+ write
create policy "customers: staff read" on public.customers
  for select using (public.is_staff());
create policy "customers: dispatcher write" on public.customers
  for all using (public.is_dispatcher()) with check (public.is_dispatcher());

create policy "sites: staff read" on public.sites
  for select using (public.is_staff());
create policy "sites: dispatcher write" on public.sites
  for all using (public.is_dispatcher()) with check (public.is_dispatcher());

-- assets: staff read + update (techs change status/service dates), dispatcher+ create/delete
create policy "assets: staff read" on public.assets
  for select using (public.is_staff());
create policy "assets: staff update" on public.assets
  for update using (public.is_staff()) with check (public.is_staff());
create policy "assets: dispatcher insert" on public.assets
  for insert with check (public.is_dispatcher());
create policy "assets: dispatcher delete" on public.assets
  for delete using (public.is_dispatcher());

-- asset events: append-only audit trail
create policy "asset_events: staff read" on public.asset_events
  for select using (public.is_staff());
create policy "asset_events: staff insert" on public.asset_events
  for insert with check (public.is_staff());

-- jobs: technicians see only their assigned jobs; dispatchers see all
create policy "jobs: assigned or dispatcher read" on public.jobs
  for select using (assigned_to = auth.uid() or public.is_dispatcher());
create policy "jobs: dispatcher insert" on public.jobs
  for insert with check (public.is_dispatcher());
create policy "jobs: assigned tech or dispatcher update" on public.jobs
  for update using (assigned_to = auth.uid() or public.is_dispatcher())
  with check (assigned_to = auth.uid() or public.is_dispatcher());
create policy "jobs: admin delete" on public.jobs
  for delete using (public.is_admin());

-- inspections / defects / photos / signatures: staff read, tech inserts own work
create policy "inspections: staff read" on public.inspections
  for select using (public.is_staff());
create policy "inspections: tech insert own" on public.inspections
  for insert with check (public.is_staff() and technician_id = auth.uid());

create policy "defects: staff read" on public.defects
  for select using (public.is_staff());
create policy "defects: tech insert own" on public.defects
  for insert with check (public.is_staff() and technician_id = auth.uid());
create policy "defects: dispatcher update" on public.defects
  for update using (public.is_dispatcher() or technician_id = auth.uid())
  with check (public.is_dispatcher() or technician_id = auth.uid());

create policy "photos: staff read" on public.photos
  for select using (public.is_staff());
create policy "photos: tech insert own" on public.photos
  for insert with check (public.is_staff() and technician_id = auth.uid());

create policy "signatures: staff read" on public.signatures
  for select using (public.is_staff());
create policy "signatures: staff insert" on public.signatures
  for insert with check (public.is_staff());

-- stock
create policy "stock_items: staff read" on public.stock_items
  for select using (public.is_staff());
create policy "stock_items: dispatcher write" on public.stock_items
  for all using (public.is_dispatcher()) with check (public.is_dispatcher());

create policy "van_stock: own or dispatcher read" on public.van_stock
  for select using (technician_id = auth.uid() or public.is_dispatcher());
create policy "van_stock: dispatcher write" on public.van_stock
  for all using (public.is_dispatcher()) with check (public.is_dispatcher());

create policy "stock_usage: own or dispatcher read" on public.stock_usage
  for select using (technician_id = auth.uid() or public.is_dispatcher());
create policy "stock_usage: tech insert own" on public.stock_usage
  for insert with check (public.is_staff() and technician_id = auth.uid());

-- reports
create policy "reports: staff read" on public.reports
  for select using (public.is_staff());
create policy "reports: staff insert" on public.reports
  for insert with check (public.is_staff());

-- website leads: dispatcher+ read only (inserts happen via service role)
create policy "quote_requests: dispatcher read" on public.quote_requests
  for select using (public.is_dispatcher());
create policy "compliance_leads: dispatcher read" on public.compliance_leads
  for select using (public.is_dispatcher());
create policy "training_registrations: dispatcher read" on public.training_registrations
  for select using (public.is_dispatcher());

-- ───────────────────────────────────────────────────────────────────────────
-- 15. STORAGE BUCKETS (private – job photos, signatures, generated reports)
-- ───────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values
  ('job-photos', 'job-photos', false),
  ('signatures', 'signatures', false),
  ('reports', 'reports', false)
on conflict (id) do nothing;

create policy "storage: staff read fsm buckets" on storage.objects
  for select using (
    bucket_id in ('job-photos', 'signatures', 'reports') and public.is_staff()
  );

create policy "storage: staff upload fsm buckets" on storage.objects
  for insert with check (
    bucket_id in ('job-photos', 'signatures', 'reports') and public.is_staff()
  );

create policy "storage: staff update fsm buckets" on storage.objects
  for update using (
    bucket_id in ('job-photos', 'signatures', 'reports') and public.is_staff()
  );
