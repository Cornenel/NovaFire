-- SAFE CUSTOMER UPDATES - ADDITIVE, BACKWARD-COMPATIBLE
--
-- PURPOSE:
--   Allow admins to update customer master data without recreating customers or
--   touching linked jobs, sites, assets, inspections, reports or import rows.
--
-- SAFETY:
--   - Adds nullable customer fields only.
--   - Adds an append-only customer update history table.
--   - Preserves dispatcher/admin customer creation for existing workflows.
--   - Restricts customer updates/deletes to admins only.

alter table public.customers
  add column if not exists trading_name text,
  add column if not exists registration_number text,
  add column if not exists physical_address text,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive')),
  add column if not exists legacy_zoho_customer_id text,
  add column if not exists import_source text,
  add column if not exists import_raw_data jsonb;

create index if not exists customers_status_idx
  on public.customers (status);
create index if not exists customers_normalized_name_idx
  on public.customers (lower(name));
create index if not exists customers_normalized_email_idx
  on public.customers (lower(email))
  where email is not null;
create index if not exists customers_phone_idx
  on public.customers (phone)
  where phone is not null;
create index if not exists customers_legacy_zoho_customer_id_idx
  on public.customers (legacy_zoho_customer_id)
  where legacy_zoho_customer_id is not null;

create table if not exists public.customer_update_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  updated_by uuid references public.profiles (id),
  old_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  changed_fields jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists customer_update_history_customer_idx
  on public.customer_update_history (customer_id, updated_at desc);

alter table public.customer_update_history enable row level security;

drop policy if exists "customer_update_history: admin read" on public.customer_update_history;
drop policy if exists "customer_update_history: admin insert" on public.customer_update_history;

create policy "customer_update_history: admin read" on public.customer_update_history
  for select using (public.is_admin());
create policy "customer_update_history: admin insert" on public.customer_update_history
  for insert with check (public.is_admin());

create or replace function public.log_customer_update_history()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  old_json jsonb := to_jsonb(old);
  new_json jsonb := to_jsonb(new);
  changed jsonb;
begin
  select coalesce(jsonb_agg(key), '[]'::jsonb)
  into changed
  from jsonb_each(new_json)
  where key <> 'updated_at'
    and old_json -> key is distinct from value;

  if changed <> '[]'::jsonb then
    insert into public.customer_update_history (
      customer_id,
      updated_by,
      old_values,
      new_values,
      changed_fields
    )
    values (
      new.id,
      auth.uid(),
      old_json,
      new_json,
      changed
    );
  end if;

  return new;
end;
$$;

drop trigger if exists customers_update_history on public.customers;
create trigger customers_update_history
  after update on public.customers
  for each row execute function public.log_customer_update_history();

-- Replace the broad dispatcher+ all-policy with action-specific policies.
drop policy if exists "customers: staff read" on public.customers;
drop policy if exists "customers: dispatcher write" on public.customers;
drop policy if exists "customers: dispatcher/admin read assigned" on public.customers;
drop policy if exists "customers: dispatcher insert" on public.customers;
drop policy if exists "customers: admin update" on public.customers;
drop policy if exists "customers: admin delete" on public.customers;

create policy "customers: dispatcher/admin read assigned" on public.customers
  for select using (
    public.is_dispatcher()
    or exists (
      select 1
      from public.jobs
      where jobs.customer_id = customers.id
        and jobs.assigned_to = auth.uid()
    )
  );

create policy "customers: dispatcher insert" on public.customers
  for insert with check (public.is_dispatcher());

create policy "customers: admin update" on public.customers
  for update using (public.is_admin()) with check (public.is_admin());

create policy "customers: admin delete" on public.customers
  for delete using (public.is_admin());
