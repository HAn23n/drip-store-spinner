-- wheel_prizes: the list of segments shown on the spin wheel.
create table if not exists public.wheel_prizes (
  id bigint generated always as identity primary key,
  label text not null,
  description text not null default '',
  color text not null default 'espresso',
  weight integer not null default 1 check (weight >= 1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists wheel_prizes_sort_order_idx on public.wheel_prizes (sort_order);

alter table public.wheel_prizes enable row level security;

-- Anyone (including the anon key) may read the prize list — it drives the public
-- spin page.
create policy "wheel_prizes_public_read"
  on public.wheel_prizes
  for select
  using (true);

-- Intentionally no insert/update/delete policy for anon/authenticated roles.
-- Writes only happen through the Next.js API routes (app/api/admin/prizes),
-- which authenticate the shop owner's password and use the service_role key
-- that bypasses RLS. This is what stops anyone from writing straight to the
-- table with just the public anon key.

-- Seed data — safe to run once; skipped if the table already has rows.
insert into public.wheel_prizes (label, description, color, weight, sort_order)
select * from (values
  ('ส่วนลด 5 บาท',   'หักส่วนลด 5 บาท เมื่อสั่งเครื่องดื่มใดก็ได้', 'espresso', 22, 0),
  ('น้ำฟรี 1 แก้ว',   'รับเครื่องดื่มเมนูปกติฟรี 1 แก้ว',            'gold',     1,  1),
  ('ลดอาหาร 10%',    'ส่วนลด 10% สำหรับเมนูอาหารในร้าน',           'espresso', 4,  2),
  ('ฟรีท็อปปิ้ง',     'เพิ่มท็อปปิ้งฟรี 1 อย่างในเครื่องดื่ม',        'cherry',   3,  3),
  ('ลด 15 บาท',      'หักส่วนลด 15 บาท เมื่อสั่งเครื่องดื่มใดก็ได้',  'espresso', 8,  4),
  ('ลุ้นใหม่รอบหน้า', 'รอบนี้ยังไม่ถูกรางวัล ลองหมุนอีกครั้งได้เลย',  'leaf',     2,  5)
) as seed(label, description, color, weight, sort_order)
where not exists (select 1 from public.wheel_prizes);
