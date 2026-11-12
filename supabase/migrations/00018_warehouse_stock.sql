-- Warehouse stock layer beside existing van_stock / stock_usage.
-- Tech job consumption (stock_usage + apply_stock_usage) is unchanged.

-- ── Catalog extensions ─────────────────────────────────────────────────────
alter table public.stock_items
  add column if not exists sku text,
  add column if not exists source text not null default 'manual',
  add column if not exists legacy_zoho_item_id text,
  add column if not exists zoho_organization_id text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.stock_items
  drop constraint if exists stock_items_source_check;
alter table public.stock_items
  add constraint stock_items_source_check
  check (source in ('manual', 'zoho'));

create unique index if not exists stock_items_legacy_zoho_item_uidx
  on public.stock_items (zoho_organization_id, legacy_zoho_item_id)
  where legacy_zoho_item_id is not null;

-- ── Warehouse on-hand (single warehouse v1) ────────────────────────────────
create table if not exists public.warehouse_stock (
  stock_item_id uuid primary key references public.stock_items (id) on delete cascade,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  updated_at timestamptz not null default now()
);

-- ── Movement audit ─────────────────────────────────────────────────────────
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  stock_item_id uuid not null references public.stock_items (id) on delete cascade,
  movement_type text not null,
  quantity_delta integer not null,
  quantity_before integer,
  quantity_after integer,
  technician_id uuid references public.profiles (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  constraint stock_movements_type_check check (
    movement_type in (
      'zoho_import',
      'warehouse_adjust',
      'issue_to_van',
      'van_set'
    )
  )
);

create index if not exists stock_movements_item_idx
  on public.stock_movements (stock_item_id, created_at desc);
create index if not exists stock_movements_created_idx
  on public.stock_movements (created_at desc);

alter table public.warehouse_stock enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists "warehouse_stock: staff read" on public.warehouse_stock;
create policy "warehouse_stock: staff read" on public.warehouse_stock
  for select using (public.is_staff());

drop policy if exists "warehouse_stock: dispatcher write" on public.warehouse_stock;
create policy "warehouse_stock: dispatcher write" on public.warehouse_stock
  for all using (public.is_dispatcher()) with check (public.is_dispatcher());

drop policy if exists "stock_movements: staff read" on public.stock_movements;
create policy "stock_movements: staff read" on public.stock_movements
  for select using (public.is_staff());

drop policy if exists "stock_movements: dispatcher write" on public.stock_movements;
create policy "stock_movements: dispatcher write" on public.stock_movements
  for insert with check (public.is_dispatcher());

-- Seed warehouse rows for any existing catalog items (qty 0).
insert into public.warehouse_stock (stock_item_id, quantity_on_hand)
select id, 0 from public.stock_items
on conflict (stock_item_id) do nothing;

-- ── Issue warehouse → van (atomic) ─────────────────────────────────────────
create or replace function public.issue_warehouse_to_van(
  p_technician_id uuid,
  p_stock_item_id uuid,
  p_quantity integer,
  p_actor_id uuid default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before integer;
  v_after integer;
  v_van integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  if not public.is_dispatcher() then
    raise exception 'Only dispatchers or admins can issue warehouse stock';
  end if;

  select quantity_on_hand into v_before
  from public.warehouse_stock
  where stock_item_id = p_stock_item_id
  for update;

  if not found then
    insert into public.warehouse_stock (stock_item_id, quantity_on_hand)
    values (p_stock_item_id, 0)
    on conflict (stock_item_id) do nothing;

    select quantity_on_hand into v_before
    from public.warehouse_stock
    where stock_item_id = p_stock_item_id
    for update;
  end if;

  if coalesce(v_before, 0) < p_quantity then
    raise exception 'Insufficient warehouse stock (have %, need %)', coalesce(v_before, 0), p_quantity;
  end if;

  v_after := v_before - p_quantity;

  update public.warehouse_stock
  set quantity_on_hand = v_after,
      updated_at = now()
  where stock_item_id = p_stock_item_id;

  insert into public.van_stock (technician_id, stock_item_id, quantity, updated_at)
  values (p_technician_id, p_stock_item_id, p_quantity, now())
  on conflict (technician_id, stock_item_id) do update
  set quantity = public.van_stock.quantity + excluded.quantity,
      updated_at = now();

  insert into public.stock_movements (
    stock_item_id,
    movement_type,
    quantity_delta,
    quantity_before,
    quantity_after,
    technician_id,
    actor_id,
    notes
  ) values (
    p_stock_item_id,
    'issue_to_van',
    -p_quantity,
    v_before,
    v_after,
    p_technician_id,
    p_actor_id,
    p_notes
  );
end;
$$;

revoke all on function public.issue_warehouse_to_van(uuid, uuid, integer, uuid, text) from public;
grant execute on function public.issue_warehouse_to_van(uuid, uuid, integer, uuid, text) to authenticated;

-- ── Adjust warehouse on-hand (atomic) ──────────────────────────────────────
create or replace function public.adjust_warehouse_stock(
  p_stock_item_id uuid,
  p_new_quantity integer,
  p_actor_id uuid default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before integer;
  v_delta integer;
begin
  if p_new_quantity is null or p_new_quantity < 0 then
    raise exception 'Quantity on hand cannot be negative';
  end if;

  if not public.is_dispatcher() then
    raise exception 'Only dispatchers or admins can adjust warehouse stock';
  end if;

  select quantity_on_hand into v_before
  from public.warehouse_stock
  where stock_item_id = p_stock_item_id
  for update;

  if not found then
    insert into public.warehouse_stock (stock_item_id, quantity_on_hand)
    values (p_stock_item_id, 0)
    on conflict (stock_item_id) do nothing;

    select quantity_on_hand into v_before
    from public.warehouse_stock
    where stock_item_id = p_stock_item_id
    for update;
  end if;

  v_before := coalesce(v_before, 0);
  v_delta := p_new_quantity - v_before;

  update public.warehouse_stock
  set quantity_on_hand = p_new_quantity,
      updated_at = now()
  where stock_item_id = p_stock_item_id;

  insert into public.stock_movements (
    stock_item_id,
    movement_type,
    quantity_delta,
    quantity_before,
    quantity_after,
    actor_id,
    notes
  ) values (
    p_stock_item_id,
    'warehouse_adjust',
    v_delta,
    v_before,
    p_new_quantity,
    p_actor_id,
    coalesce(nullif(trim(p_notes), ''), 'Manual warehouse adjustment')
  );
end;
$$;

revoke all on function public.adjust_warehouse_stock(uuid, integer, uuid, text) from public;
grant execute on function public.adjust_warehouse_stock(uuid, integer, uuid, text) to authenticated;
