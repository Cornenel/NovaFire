-- ═══════════════════════════════════════════════════════════════════════════
-- TECHNICIAN MANAGEMENT – ADDITIVE, BACKWARD-COMPATIBLE
--
-- PRE-CHANGE INSPECTION (verified against 00001):
--   • public.profiles already exists (id → auth.users, full_name, phone,
--     role enum, is_active). It is EXTENDED below – no new user table.
--   • Job assignment uses a single field: jobs.assigned_to → profiles(id).
--     No legacy assignment field exists, so no dual-field support is needed.
--     This migration does NOT touch the jobs table at all.
--   • RLS already restricts technicians to their assigned jobs.
--
-- IMPACT REPORT:
--   1. profiles: six new NULLABLE columns – existing reads/writes unaffected.
--   2. handle_new_user(): extended to capture email/name metadata and honour
--      an "invited_role" set by admin invites. Plain public signups behave
--      exactly as before (no invited_role in their metadata).
--   3. enforce_role_change(): now also permits server-side (service-role)
--      role updates, where auth.uid() is null. Authenticated non-admins are
--      still blocked exactly as before. Additionally protects is_active so
--      only admins / the server can (de)activate accounts.
--   4. is_staff()/is_dispatcher()/is_admin(): now also require is_active.
--      Every existing profile defaults to is_active = true, so behaviour is
--      unchanged for all current users; deactivated accounts lose staff
--      access at the database level (defence in depth – the app layout
--      already blocks them).
--   No tables, columns or policies dropped or renamed. jobs untouched.
--
-- ROLLBACK STRATEGY:
--   • Columns:  alter table public.profiles
--                 drop column first_name, drop column last_name,
--                 drop column email, drop column vehicle_number,
--                 drop column saqcc_number, drop column photo_url;
--   • Functions: re-run sections 2 of migration 00001 to restore the
--     previous function bodies (create or replace is idempotent).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Additive technician fields (all nullable – zero impact on existing rows)
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists email text,
  add column if not exists vehicle_number text,
  add column if not exists saqcc_number text,
  add column if not exists photo_url text;

create index if not exists profiles_role_idx on public.profiles (role, is_active);

-- Backfill email from auth.users for existing profiles
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- 2. Signup trigger: also capture email + names, and honour admin invites.
--    Public signups without "invited_role" metadata behave exactly as before.
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
      -- Admin-issued invites may pre-assign a staff role (never admin)
      when v_invited in ('technician', 'dispatcher') then v_invited::public.user_role
      when new.email ilike '%@novafire.co.za' then 'technician'::public.user_role
      else 'client'::public.user_role
    end
  );
  return new;
end;
$$;

-- 3. Role/active protection: unchanged for authenticated users; additionally
--    allows server-side (service-role) updates where auth.uid() is null, and
--    protects is_active from self-service changes.
create or replace function public.enforce_role_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new; -- service-role / server-side admin operation
  end if;
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  if new.is_active is distinct from old.is_active and not public.is_admin() then
    raise exception 'Only admins can activate or deactivate accounts';
  end if;
  return new;
end;
$$;

-- 4. Staff helpers now also require an ACTIVE account.
--    All existing profiles default to is_active = true → no behaviour change
--    for current users; deactivated staff lose access at the RLS level.
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
      and role in ('technician', 'dispatcher', 'admin')
  );
$$;

create or replace function public.is_dispatcher()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
      and role in ('dispatcher', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role = 'admin'
  );
$$;
