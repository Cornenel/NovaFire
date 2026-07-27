-- NovaFire website form tables
--
-- These tables store submissions from the native website forms
-- (compliance check, quote request, training registration, portal service request).
--
-- Tables are created by: supabase/migrations/00001_field_service_schema.sql
-- Inserts happen in app code via server actions using SUPABASE_SERVICE_ROLE_KEY.
-- Dispatchers/admins can read rows via existing RLS policies.
--
-- Run this file in Supabase → SQL Editor only if the tables are missing
-- (safe to re-run — uses IF NOT EXISTS).

begin;

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text not null,
  phone text,
  service_interest text,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.compliance_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text not null,
  phone text,
  answers jsonb not null default '{}'::jsonb,
  score integer,
  created_at timestamptz not null default now()
);

create table if not exists public.training_registrations (
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

create index if not exists quote_requests_created_idx
  on public.quote_requests (created_at desc);

create index if not exists compliance_leads_created_idx
  on public.compliance_leads (created_at desc);

create index if not exists training_registrations_created_idx
  on public.training_registrations (created_at desc);

alter table public.quote_requests enable row level security;
alter table public.compliance_leads enable row level security;
alter table public.training_registrations enable row level security;

-- Dispatcher read policies (skip if already present)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'quote_requests'
      and policyname = 'quote_requests: dispatcher read'
  ) then
    create policy "quote_requests: dispatcher read" on public.quote_requests
      for select using (public.is_dispatcher());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'compliance_leads'
      and policyname = 'compliance_leads: dispatcher read'
  ) then
    create policy "compliance_leads: dispatcher read" on public.compliance_leads
      for select using (public.is_dispatcher());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'training_registrations'
      and policyname = 'training_registrations: dispatcher read'
  ) then
    create policy "training_registrations: dispatcher read" on public.training_registrations
      for select using (public.is_dispatcher());
  end if;
end $$;

commit;

-- ── Useful queries ──────────────────────────────────────────────────────────

-- Recent compliance leads (with score)
-- select id, company, name, email, phone, score, created_at
-- from public.compliance_leads
-- order by created_at desc
-- limit 20;

-- Recent quote / service requests
-- select id, name, company, email, service_interest, left(message, 80) as message, created_at
-- from public.quote_requests
-- order by created_at desc
-- limit 20;

-- Recent training registrations
-- select id, name, company, course, attendees, preferred_date, created_at
-- from public.training_registrations
-- order by created_at desc
-- limit 20;
