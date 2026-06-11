-- ═══════════════════════════════════════════════════════════════════════════
-- DEMO SEED DATA (optional – run after 00001 to test the technician app)
--
-- NOTE: Sign up at least one @novafire.co.za user FIRST (they become a
-- technician automatically). The last statement assigns all demo jobs to
-- the oldest staff profile.
-- ═══════════════════════════════════════════════════════════════════════════

-- Customers
insert into public.customers (id, name, contact_person, email, phone, is_sla_client) values
  ('11111111-1111-1111-1111-111111111111', 'Kruger Lodge Group', 'Pieter Botha', 'pieter@krugerlodge.co.za', '+27 82 555 0101', true),
  ('22222222-2222-2222-2222-222222222222', 'Nelspruit Mall (Pty) Ltd', 'Sarah Nkosi', 'sarah@nelspruitmall.co.za', '+27 83 555 0202', false);

-- Sites
insert into public.sites (id, customer_id, name, address, latitude, longitude, contact_person, contact_phone, access_notes) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
   'Kruger Lodge – Main Camp', 'R536 Sabie River Rd, Hazyview, 1242', -25.0466, 31.1262,
   'Pieter Botha', '+27 82 555 0101', 'Report to security gate. Ask for duty manager.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
   'Kruger Lodge – River Camp', 'Sabie River Rd, Hazyview, 1242', -25.0521, 31.1410,
   'Anna du Toit', '+27 82 555 0303', 'Access via main camp. 4x4 recommended in wet season.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222',
   'Nelspruit Mall', '1 Madiba Dr, Mbombela, 1200', -25.4753, 30.9694,
   'Sarah Nkosi', '+27 83 555 0202', 'Service entrance B, parking level -1. Sign in at control room.');

-- Assets
insert into public.assets (site_id, asset_type, size_capacity, serial_number, location_description, last_service_date, next_service_date, status) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fire_extinguisher', '9kg DCP',  'DCP-2031-88', 'Kitchen, next to back door',      '2025-06-01', '2026-06-01', 'compliant'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fire_extinguisher', '4.5kg DCP','DCP-1144-02', 'Reception, behind front desk',    '2025-06-01', '2026-06-01', 'compliant'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'co2_unit',          '5kg CO2',  'CO2-7733-19', 'Generator room',                  '2025-06-01', '2026-06-01', 'defective'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fire_blanket',      '1.2m',     null,          'Kitchen wall, by stove',          '2025-06-01', '2026-06-01', 'compliant'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'fire_extinguisher', '9kg DCP',  'DCP-5520-41', 'Boma area, storage hut',          '2025-03-15', '2026-03-15', 'compliant'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'hose_reel',         '30m',      'HR-0091-33',  'Pool pump room, external wall',   '2025-03-15', '2026-03-15', 'compliant'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'hydrant',           null,       'HYD-014',     'Parking level -1, pillar B12',    '2025-09-10', '2026-09-10', 'compliant'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'hose_reel',         '30m',      'HR-2210-07',  'Food court, service corridor',    '2025-09-10', '2026-09-10', 'compliant'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'fire_extinguisher', '5kg CO2',  'CO2-9981-55', 'Electrical room, level 1',        '2025-09-10', '2026-09-10', 'missing'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'signage',           null,       null,          'Escape route, east wing',         '2025-09-10', '2026-09-10', 'compliant');

-- Jobs for today
insert into public.jobs (customer_id, site_id, job_type, priority, status, scheduled_date, description, contact_person, contact_phone) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'annual_service', 'high', 'not_started', current_date,
   'Annual service of all extinguishers and fire blankets. CO2 unit in generator room reported defective last visit – inspect and quote.',
   'Pieter Botha', '+27 82 555 0101'),
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'inspection', 'medium', 'not_started', current_date,
   'Quarterly SLA inspection – extinguisher and hose reel checks.',
   'Anna du Toit', '+27 82 555 0303'),
  ('22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'callout', 'emergency', 'not_started', current_date,
   'CO2 extinguisher missing from electrical room. Replace from van stock and update register.',
   'Sarah Nkosi', '+27 83 555 0202'),
  ('22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'pressure_test', 'low', 'not_started', current_date + 1,
   'Pressure test hose reels in food court service corridor.',
   'Sarah Nkosi', '+27 83 555 0202');

-- Assign all unassigned demo jobs to the oldest staff member
update public.jobs
set assigned_to = (
  select id from public.profiles
  where role in ('technician', 'dispatcher', 'admin')
  order by created_at
  limit 1
)
where assigned_to is null;

-- Give that technician some van stock
insert into public.van_stock (technician_id, stock_item_id, quantity)
select p.id, s.id, 5
from (
  select id from public.profiles
  where role in ('technician', 'dispatcher', 'admin')
  order by created_at limit 1
) p
cross join public.stock_items s
on conflict do nothing;
