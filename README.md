# Drip Store — วงล้อชิงรางวัล

Next.js (App Router) + Supabase. วงล้อ SVG, ฟิสิกส์การหมุน, และดีไซน์เดิมทั้งหมด
ย้ายมาจากต้นแบบไฟล์เดียว ไม่มีการออกแบบ UI ใหม่ — แค่จัดโครงสร้างโค้ดใหม่

ไม่มีระบบรหัสผ่าน — เข้าหน้าแก้ไขได้เลย เหมือนต้นแบบเดิม

- หน้าหมุน: `/`
- หน้าแก้ไขวงล้อ: `/admin`
- หน้าประวัติการหมุน: `/admin/history`

## โครงสร้าง

- `app/page.tsx` — หน้าหมุน โหลดรายการรางวัลจาก Supabase ทุกครั้งที่เปิดหน้า (`GET /api/prizes`) และบันทึกประวัติการหมุนทุกครั้งที่หมุนเสร็จ (`POST /api/spins`, fire-and-forget ไม่บล็อกการหมุน)
- `app/admin/page.tsx` — หน้าแก้ไขรายการรางวัล เปอร์เซ็นต์โอกาสของทุกช่องจะถูกปรับให้รวมกันเป็น 100% เสมอเวลาแก้ไขช่องใดช่องหนึ่ง (ดู `rebalanceWeights`/`normalizeWeightsTo100` ใน `lib/wheel-shared.ts`) บันทึกสำเร็จจะขึ้น toast แจ้งเตือน
- `app/admin/history/page.tsx` — ตารางประวัติผลการหมุนทั้งหมด แบ่งหน้าละ 5 รายการ พร้อมปุ่มส่งออกเป็นไฟล์ Excel (.xlsx)
- `app/api/prizes` — public, อ่านอย่างเดียว
- `app/api/admin/prizes` — อ่าน/เขียนรายการรางวัลด้วย Supabase service_role key (client ไม่ได้เขียนตรงด้วย anon key)
- `app/api/spins` — บันทึก/อ่านประวัติการหมุน (แบ่งหน้า) ด้วย service_role key เช่นกัน
- `app/api/spins/export` — สร้างไฟล์ .xlsx จากประวัติทั้งหมดแล้วส่งกลับให้ดาวน์โหลด
- `lib/wheel-shared.ts` — โค้ดวาดวงล้อ SVG, การสุ่มถ่วงน้ำหนัก, การบังคับข้อความให้พอดี (textLength/lengthAdjust) — เหมือนต้นแบบเดิมทุกจุด
- `supabase/migrations/0001_wheel_prizes.sql` — ตาราง `wheel_prizes` + RLS (อ่านได้สาธารณะ, เขียนได้เฉพาะผ่าน service_role ใน API route เท่านั้น ไม่ใช่ตรงจาก client ด้วย anon key)
- `supabase/migrations/0002_spin_history.sql` — ตาราง `spin_history` เก็บประวัติการหมุน ไม่มี RLS policy ให้ client เลย (อ่าน/เขียนผ่าน API route ด้วย service_role เท่านั้น)

## เริ่มต้นใช้งาน (local)

```bash
npm install
cp .env.example .env.local
```

แก้ `.env.local`:

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

สร้างตารางใน Supabase: เปิด Supabase Dashboard → SQL Editor → วางเนื้อหาไฟล์
`supabase/migrations/0001_wheel_prizes.sql` แล้วรัน จากนั้นรัน
`supabase/migrations/0002_spin_history.sql` ด้วย (คนละไฟล์ รันทีละไฟล์) —
หรือใช้ Supabase CLI: `supabase db push` ถ้าตั้ง CLI เชื่อมโปรเจกต์ไว้แล้ว

รัน dev server:

```bash
npm run dev
```

## Deploy ขึ้น Vercel

```bash
npm i -g vercel   # ถ้ายังไม่มี
vercel
```

ตั้งค่า Environment Variables ใน Vercel Project Settings → Environment Variables
ให้ตรงกับ `.env.example` ทั้ง 3 ตัว (สำหรับทั้ง Production และ Preview) แล้ว deploy
อีกครั้ง (`vercel --prod`) เพื่อให้ค่าที่ตั้งมีผล

ห้าม commit ไฟล์ `.env` หรือ `.env.local` ขึ้น git — คีย์ทั้งหมดต้องอยู่ใน environment
variables เท่านั้น (`.gitignore` กันไว้ให้แล้ว)
