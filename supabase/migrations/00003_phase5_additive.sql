-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 5 – ADDITIVE ENHANCEMENTS ONLY
--
-- IMPACT REPORT:
--   1. assets.hydro_test_due_date (new NULLABLE column)
--      - Backward compatible: existing reads (`select *`) gain one nullable
--        field; no existing insert/update statements are affected because
--        the column is nullable with no constraint.
--      - Used by: Smart Asset Insights (Feature 1) and Auto Service
--        Recommendations (Feature 4). Read-only in technician UI.
--   2. quote_recommendations (new table)
--      - Staging area for Defect-to-Quote Preparation (Feature 7).
--      - No foreign workflow writes to it; populated lazily by the admin
--        quotes page; one row per defect (unique constraint = idempotent).
--   3. No tables renamed. No columns renamed. No types altered.
--      No policies on existing tables changed. No triggers altered.
--
-- ROLLBACK STRATEGY:
--   alter table public.assets drop column if exists hydro_test_due_date;
--   drop table if exists public.quote_recommendations;
--   (Both are safe: nothing in Phases 1-4 references these structures.)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Hydro test due date (nullable – additive)
alter table public.assets
  add column if not exists hydro_test_due_date date;

-- 2. Quote recommendations staging area
create table if not exists public.quote_recommendations (
  id uuid primary key default gen_random_uuid(),
  defect_id uuid not null unique references public.defects (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  asset_id uuid references public.assets (id) on delete set null,
  recommended_item text not null,
  notes text,
  status text not null default 'suggested'
    check (status in ('suggested', 'accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_recommendations_status_idx
  on public.quote_recommendations (status);

create trigger set_updated_at before update on public.quote_recommendations
  for each row execute function public.set_updated_at();

alter table public.quote_recommendations enable row level security;

create policy "quote_recommendations: staff read" on public.quote_recommendations
  for select using (public.is_staff());
create policy "quote_recommendations: dispatcher write" on public.quote_recommendations
  for all using (public.is_dispatcher()) with check (public.is_dispatcher());
