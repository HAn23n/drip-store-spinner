# Drip Store — วงล้อชิงรางวัล

Next.js (App Router) + Supabase. วงล้อ SVG, ฟิสิกส์การหมุน, และดีไซน์เดิมทั้งหมด
ย้ายมาจากต้นแบบไฟล์เดียว ไม่มีการออกแบบ UI ใหม่ — แค่จัดโครงสร้างโค้ดใหม่

- หน้าหมุน: `/`
- หน้าแก้ไขวงล้อ (ต้องใส่รหัสผ่าน): `/admin`

## โครงสร้าง

- `app/page.tsx` — หน้าหมุน โหลดรายการรางวัลจาก Supabase ทุกครั้งที่เปิดหน้า (`GET /api/prizes`)
- `app/admin/**` — หน้าแก้ไข (ต้องล็อกอินก่อน) + หน้าล็อกอิน
- `app/api/prizes` — public, อ่านอย่างเดียว
- `app/api/admin/prizes` — ต้องมี session cookie ที่ถูกต้อง อ่าน/เขียนด้วย Supabase service_role key
- `app/api/admin/login`, `app/api/admin/logout` — ตรวจรหัสผ่านจาก `ADMIN_PASSWORD` แล้วออก cookie ที่เซ็นด้วย HMAC (`ADMIN_SESSION_SECRET`)
- `middleware.ts` — กันหน้า `/admin/*` และ API เขียนข้อมูล ไม่ให้เข้าถึงโดยไม่มี session
- `lib/wheel-shared.ts` — โค้ดวาดวงล้อ SVG, การสุ่มถ่วงน้ำหนัก, การบังคับข้อความให้พอดี (textLength/lengthAdjust) — เหมือนต้นแบบเดิมทุกจุด
- `supabase/migrations/0001_wheel_prizes.sql` — ตาราง `wheel_prizes` + RLS (อ่านได้สาธารณะ, เขียนได้เฉพาะผ่าน service_role ใน API route เท่านั้น ไม่ใช่ตรงจาก client ด้วย anon key)

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
ADMIN_PASSWORD=รหัสผ่านที่ต้องการ
ADMIN_SESSION_SECRET=สุ่มด้วย: openssl rand -hex 32
```

สร้างตารางใน Supabase: เปิด Supabase Dashboard → SQL Editor → วางเนื้อหาไฟล์
`supabase/migrations/0001_wheel_prizes.sql` แล้วรัน (หรือใช้ Supabase CLI:
`supabase db push` ถ้าตั้ง CLI เชื่อมโปรเจกต์ไว้แล้ว)

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
ให้ตรงกับ `.env.example` ทั้ง 5 ตัว (สำหรับทั้ง Production และ Preview) แล้ว deploy
อีกครั้ง (`vercel --prod`) เพื่อให้ค่าที่ตั้งมีผล

ห้าม commit ไฟล์ `.env` หรือ `.env.local` ขึ้น git — คีย์ทั้งหมดต้องอยู่ใน environment
variables เท่านั้น (`.gitignore` กันไว้ให้แล้ว)
