-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 2 – CUSTOMER PORTAL (ADDITIVE ONLY)
--
-- Adds portal linkage on profiles, customer-approval fields on quote staging,
-- portal RLS helpers, and read-only (plus limited quote-approval) policies for
-- client-role users linked to a customer record.
--
-- ROLLBACK (manual):
--   drop policies added below; drop functions portal_* / is_portal_user;
--   alter table public.profiles drop column customer_id, portal_site_id,
--     portal_access_enabled, last_portal_login_at;
--   alter table public.quote_recommendations drop column customer_approved_at,
--     customer_rejected_at;
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists customer_id uuid references public.customers (id) on delete set null,
  add column if not exists portal_site_id uuid references public.sites (id) on delete set null,
  add column if not exists portal_access_enabled boolean not null default true,
  add column if not exists last_portal_login_at timestamptz;

create index if not exists profiles_customer_portal_idx
  on public.profiles (customer_id, role, portal_access_enabled);

alter table public.quote_recommendations
  add column if not exists customer_approved_at timestamptz,
  add column if not exists customer_rejected_at timestamptz;

-- ── Portal access helpers ───────────────────────────────────────────────────

create or replace function public.is_portal_user()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active
      and role = 'client'
      and portal_access_enabled
      and customer_id is not null
  );
$$;

create or replace function public.portal_customer_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select customer_id
  from public.profiles
  where id = auth.uid()
    and is_active
    and role = 'client'
    and portal_access_enabled
$$;

create or replace function public.portal_site_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select portal_site_id
  from public.profiles
  where id = auth.uid()
    and is_active
    and role = 'client'
    and portal_access_enabled
$$;

create or replace function public.portal_can_access_site(p_site_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_portal_user()
    and exists (
      select 1
      from public.sites s
      where s.id = p_site_id
        and s.customer_id = public.portal_customer_id()
        and (
          public.portal_site_id() is null
          or s.id = public.portal_site_id()
        )
    );
$$;

-- Honour client invites from admin (metadata.invited_role = 'client').
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_first text := new.raw_user_meta_data ->> 'first_name';
  v_last  text := new.raw_user_meta_data ->> 'last_name';
  v_invited text := new.raw_user_meta_data ->> 'invited_role';
begin
  insert into public.profiles (id, full_name, first_name, last_name, email, phone, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(trim(coalesce(v_first, '') || ' ' || coalesce(v_last, '')), ''),
      ''
    ),
    v_first,
    v_last,
    new.email,
    new.raw_user_meta_data ->> 'phone',
    case
      when v_invited in ('technician', 'dispatcher') then v_invited::public.user_role
      when v_invited = 'client' then 'client'::public.user_role
      when new.email ilike '%@novafire.co.za' then 'technician'::public.user_role
      else 'client'::public.user_role
    end
  );
  return new;
end;
$$;

-- Protect portal linkage fields from self-service changes.
create or replace function public.enforce_role_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  if new.is_active is distinct from old.is_active and not public.is_admin() then
    raise exception 'Only admins can activate or deactivate accounts';
  end if;
  if (
    new.customer_id is distinct from old.customer_id
    or new.portal_site_id is distinct from old.portal_site_id
    or new.portal_access_enabled is distinct from old.portal_access_enabled
  ) and not public.is_admin() and not public.is_dispatcher() then
    raise exception 'Only staff can change portal access settings';
  end if;
  return new;
end;
$$;

-- ── Portal read policies (additive OR with existing staff policies) ─────────

create policy "customers: portal read own" on public.customers
  for select using (
    public.is_portal_user() and id = public.portal_customer_id()
  );

create policy "sites: portal read" on public.sites
  for select using (public.portal_can_access_site(id));

create policy "assets: portal read" on public.assets
  for select using (public.portal_can_access_site(site_id));

create policy "jobs: portal read" on public.jobs
  for select using (
    public.is_portal_user()
    and customer_id = public.portal_customer_id()
    and (
      public.portal_site_id() is null
      or site_id = public.portal_site_id()
    )
  );

create policy "inspections: portal read" on public.inspections
  for select using (
    exists (
      select 1
      from public.assets a
      where a.id = inspections.asset_id
        and public.portal_can_access_site(a.site_id)
    )
  );

create policy "defects: portal read" on public.defects
  for select using (
    exists (
      select 1
      from public.assets a
      where a.id = defects.asset_id
        and public.portal_can_access_site(a.site_id)
    )
  );

create policy "asset_events: portal read" on public.asset_events
  for select using (
    exists (
      select 1
      from public.assets a
      where a.id = asset_events.asset_id
        and public.portal_can_access_site(a.site_id)
    )
  );

create policy "reports: portal read" on public.reports
  for select using (
    exists (
      select 1
      from public.jobs j
      where j.id = reports.job_id
        and public.is_portal_user()
        and j.customer_id = public.portal_customer_id()
        and (
          public.portal_site_id() is null
          or j.site_id = public.portal_site_id()
        )
    )
  );

create policy "quote_recommendations: portal read" on public.quote_recommendations
  for select using (
    exists (
      select 1
      from public.assets a
      join public.sites s on s.id = a.site_id
      where a.id = quote_recommendations.asset_id
        and public.portal_can_access_site(s.id)
    )
  );

create policy "quote_recommendations: portal customer approve" on public.quote_recommendations
  for update using (
    exists (
      select 1
      from public.assets a
      where a.id = quote_recommendations.asset_id
        and public.portal_can_access_site(a.site_id)
    )
  )
  with check (
    exists (
      select 1
      from public.assets a
      where a.id = quote_recommendations.asset_id
        and public.portal_can_access_site(a.site_id)
    )
  );
