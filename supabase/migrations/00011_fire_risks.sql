-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 4 – SITE FIRE RISK REGISTER (ADDITIVE ONLY)
-- ═══════════════════════════════════════════════════════════════════════════

create type public.fire_risk_type as enum (
  'fire_hazard',
  'blocked_exit',
  'missing_signage',
  'combustible_storage',
  'electrical_risk',
  'emergency_lighting_issue',
  'evacuation_concern',
  'access_obstruction',
  'thatch_fire_spread_risk',
  'other'
);

create type public.fire_risk_severity as enum ('low', 'medium', 'high', 'critical');

create type public.fire_risk_status as enum (
  'open',
  'in_progress',
  'resolved',
  'accepted_risk'
);

create table if not exists public.fire_risks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  asset_id uuid references public.assets (id) on delete set null,
  technician_id uuid references public.profiles (id) on delete set null,
  location_description text,
  risk_type public.fire_risk_type not null,
  severity public.fire_risk_severity not null default 'medium',
  description text not null,
  recommended_action text,
  status public.fire_risk_status not null default 'open',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fire_risks_customer_idx on public.fire_risks (customer_id);
create index if not exists fire_risks_site_idx on public.fire_risks (site_id);
create index if not exists fire_risks_job_idx on public.fire_risks (job_id);
create index if not exists fire_risks_status_idx on public.fire_risks (status);
create index if not exists fire_risks_severity_idx on public.fire_risks (severity);

create trigger set_updated_at before update on public.fire_risks
  for each row execute function public.set_updated_at();

alter table public.photos
  add column if not exists fire_risk_id uuid references public.fire_risks (id) on delete set null;

create index if not exists photos_fire_risk_idx on public.photos (fire_risk_id);

alter table public.fire_risks enable row level security;

create policy "fire_risks: staff read" on public.fire_risks
  for select using (public.is_staff());

create policy "fire_risks: tech insert on assigned job" on public.fire_risks
  for insert with check (
    public.is_staff()
    and technician_id = auth.uid()
    and (
      job_id is null
      or exists (
        select 1
        from public.jobs j
        where j.id = fire_risks.job_id
          and j.assigned_to = auth.uid()
      )
    )
  );

create policy "fire_risks: dispatcher update" on public.fire_risks
  for update using (public.is_dispatcher()) with check (public.is_dispatcher());

create policy "fire_risks: portal read" on public.fire_risks
  for select using (public.portal_can_access_site(site_id));
