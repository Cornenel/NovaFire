-- Additive SAQCC-style mandatory asset inspection checklists.
-- Does not alter existing tables, columns, or policies.

-- ── Enums (new, additive) ───────────────────────────────────────────────────

create type public.inspection_checklist_status as enum (
  'draft',
  'in_progress',
  'complete',
  'complete_with_defects',
  'unable_to_complete',
  'reopened'
);

create type public.inspection_checklist_overall_result as enum (
  'serviceable',
  'repair_required',
  'recharge_required',
  'pressure_test_due',
  'condemned',
  'replacement_required',
  'quotation_required',
  'unable_to_test'
);

create type public.inspection_check_answer_result as enum (
  'pass',
  'fail',
  'not_applicable',
  'not_inspected'
);

-- ── Admin-configurable settings (singleton row) ───────────────────────────────

create table public.inspection_checklist_settings (
  id uuid primary key default gen_random_uuid(),
  photos_required_for_all_failures boolean not null default true,
  customer_acknowledgement_required boolean not null default false,
  detailed_annexure_enabled boolean not null default false,
  allow_unable_to_test boolean not null default true,
  pressure_unit text not null default 'kPa',
  flow_unit text not null default 'L/min',
  active_checklist_version text not null default 'saqcc-field-inspection-v1',
  asset_types_requiring_checklist text[] not null default array[
    'fire_extinguisher', 'hose_reel', 'hydrant', 'signage'
  ]::text[],
  defect_severity_mappings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.inspection_checklist_settings (id)
values ('00000000-0000-4000-8000-000000000001')
on conflict do nothing;

-- ── Checklist header ──────────────────────────────────────────────────────────

create table public.inspection_checklists (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  inspection_id uuid references public.inspections (id) on delete set null,
  asset_type public.asset_type not null,
  checklist_version text not null default 'saqcc-field-inspection-v1',
  status public.inspection_checklist_status not null default 'draft',
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references public.profiles (id) on delete set null,
  overall_result public.inspection_checklist_overall_result,
  notes text,
  final_condition_confirmed boolean not null default false,
  customer_informed boolean not null default false,
  reopened_at timestamptz,
  reopened_by uuid references public.profiles (id) on delete set null,
  reopen_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, asset_id, checklist_version)
);

create index inspection_checklists_job_id_idx on public.inspection_checklists (job_id);
create index inspection_checklists_asset_id_idx on public.inspection_checklists (asset_id);
create index inspection_checklists_inspection_id_idx on public.inspection_checklists (inspection_id);
create index inspection_checklists_completed_by_idx on public.inspection_checklists (completed_by);
create index inspection_checklists_status_idx on public.inspection_checklists (status);

-- ── Checklist answers ─────────────────────────────────────────────────────────

create table public.inspection_checklist_answers (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.inspection_checklists (id) on delete cascade,
  section_key text not null,
  check_key text not null,
  label text not null,
  result public.inspection_check_answer_result not null default 'not_inspected',
  value_text text,
  value_number numeric,
  unit text,
  notes text,
  photo_urls text[] not null default '{}'::text[],
  requires_action boolean not null default false,
  defect_severity public.defect_severity,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checklist_id, section_key, check_key)
);

create index inspection_checklist_answers_checklist_id_idx
  on public.inspection_checklist_answers (checklist_id);

-- ── Site observations (general, not full system certification) ──────────────

create table public.inspection_site_observations (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.inspection_checklists (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  observation_type text not null,
  description text not null,
  location_description text,
  severity public.defect_severity not null default 'medium',
  customer_facing_wording text,
  internal_note text,
  recommended_action text,
  quotation_required boolean not null default false,
  follow_up_required boolean not null default false,
  photo_urls text[] not null default '{}'::text[],
  defect_id uuid references public.defects (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inspection_site_observations_checklist_id_idx
  on public.inspection_site_observations (checklist_id);
create index inspection_site_observations_job_id_idx
  on public.inspection_site_observations (job_id);

-- ── Audit trail ───────────────────────────────────────────────────────────────

create table public.inspection_checklist_audit (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.inspection_checklists (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index inspection_checklist_audit_checklist_id_idx
  on public.inspection_checklist_audit (checklist_id);

-- ── updated_at triggers ───────────────────────────────────────────────────────

create trigger inspection_checklists_updated_at
  before update on public.inspection_checklists
  for each row execute function public.set_updated_at();

create trigger inspection_checklist_answers_updated_at
  before update on public.inspection_checklist_answers
  for each row execute function public.set_updated_at();

create trigger inspection_site_observations_updated_at
  before update on public.inspection_site_observations
  for each row execute function public.set_updated_at();

create trigger inspection_checklist_settings_updated_at
  before update on public.inspection_checklist_settings
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.inspection_checklist_settings enable row level security;
alter table public.inspection_checklists enable row level security;
alter table public.inspection_checklist_answers enable row level security;
alter table public.inspection_site_observations enable row level security;
alter table public.inspection_checklist_audit enable row level security;

-- Settings: staff read; dispatcher/admin write
create policy "checklist_settings: staff read"
  on public.inspection_checklist_settings for select
  using (public.is_staff());

create policy "checklist_settings: dispatcher write"
  on public.inspection_checklist_settings for update
  using (public.is_dispatcher());

-- Checklists: staff on assigned jobs; portal read via inspection join path
create policy "inspection_checklists: staff read"
  on public.inspection_checklists for select
  using (public.is_staff());

create policy "inspection_checklists: tech insert own job"
  on public.inspection_checklists for insert
  with check (
    public.is_staff()
    and (completed_by is null or completed_by = auth.uid())
    and exists (
      select 1 from public.jobs j
      where j.id = job_id
        and (
          public.is_dispatcher()
          or j.assigned_to = auth.uid()
        )
    )
  );

create policy "inspection_checklists: tech update own draft"
  on public.inspection_checklists for update
  using (
    public.is_staff()
    and (
      public.is_dispatcher()
      or (
        status in ('draft', 'in_progress', 'reopened')
        and exists (
          select 1 from public.jobs j
          where j.id = job_id and j.assigned_to = auth.uid()
        )
      )
    )
  );

create policy "inspection_checklists: portal read"
  on public.inspection_checklists for select
  using (
    public.is_portal_user()
    and exists (
      select 1 from public.assets a
      where a.id = asset_id
        and public.portal_can_access_site(a.site_id)
    )
    and status in ('complete', 'complete_with_defects', 'unable_to_complete')
  );

-- Answers
create policy "checklist_answers: staff read"
  on public.inspection_checklist_answers for select
  using (public.is_staff());

create policy "checklist_answers: tech write via checklist"
  on public.inspection_checklist_answers for insert
  with check (
    public.is_staff()
    and exists (
      select 1 from public.inspection_checklists c
      join public.jobs j on j.id = c.job_id
      where c.id = checklist_id
        and c.status in ('draft', 'in_progress', 'reopened')
        and (public.is_dispatcher() or j.assigned_to = auth.uid())
    )
  );

create policy "checklist_answers: tech update via checklist"
  on public.inspection_checklist_answers for update
  using (
    public.is_staff()
    and exists (
      select 1 from public.inspection_checklists c
      join public.jobs j on j.id = c.job_id
      where c.id = checklist_id
        and c.status in ('draft', 'in_progress', 'reopened')
        and (public.is_dispatcher() or j.assigned_to = auth.uid())
    )
  );

create policy "checklist_answers: portal read"
  on public.inspection_checklist_answers for select
  using (
    public.is_portal_user()
    and exists (
      select 1 from public.inspection_checklists c
      join public.assets a on a.id = c.asset_id
      where c.id = checklist_id
        and public.portal_can_access_site(a.site_id)
        and c.status in ('complete', 'complete_with_defects', 'unable_to_complete')
    )
  );

-- Site observations
create policy "site_observations: staff read"
  on public.inspection_site_observations for select
  using (public.is_staff());

create policy "site_observations: tech write"
  on public.inspection_site_observations for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "site_observations: portal read"
  on public.inspection_site_observations for select
  using (
    public.is_portal_user()
    and public.portal_can_access_site(
      (select site_id from public.assets where id = (
        select asset_id from public.inspection_checklists where id = checklist_id
      ))
    )
  );

-- Audit: staff read; system insert via staff
create policy "checklist_audit: staff read"
  on public.inspection_checklist_audit for select
  using (public.is_staff());

create policy "checklist_audit: staff insert"
  on public.inspection_checklist_audit for insert
  with check (public.is_staff());

-- Additive: allow technicians to update their own inspections (offline replay)
create policy "inspections: tech update own"
  on public.inspections for update
  using (
    public.is_staff()
    and (public.is_dispatcher() or technician_id = auth.uid())
  );
