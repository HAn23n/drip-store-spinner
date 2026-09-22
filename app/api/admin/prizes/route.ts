import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseConfig, supabaseReadClient, supabaseWriteClient, WHEEL_TABLE } from "@/lib/supabase-admin";
import { DEFAULTS, normalizePrizes, weightSum } from "@/lib/wheel-shared";

export const dynamic = "force-dynamic";

// Both routes below require the admin session cookie — enforced by middleware.ts.

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ prizes: normalizePrizes(DEFAULTS), source: "fallback" });
  }
  const { data, error } = await supabaseReadClient()
    .from(WHEEL_TABLE)
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  const prizes = data && data.length > 0 ? normalizePrizes(data) : normalizePrizes(DEFAULTS);
  return NextResponse.json({ prizes, source: data && data.length > 0 ? "supabase" : "fallback" });
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const list = (body as { prizes?: unknown[] })?.prizes;
  if (!Array.isArray(list)) {
    return NextResponse.json({ error: "body.prizes must be an array" }, { status: 400 });
  }

  const clean = normalizePrizes(list as Parameters<typeof normalizePrizes>[0]);
  if (clean.length < 2) {
    return NextResponse.json({ error: "ต้องมีอย่างน้อย 2 ช่อง" }, { status: 400 });
  }

  const total = weightSum(clean);
  if (total !== 100) {
    return NextResponse.json(
      { error: `โอกาสรวมต้องเท่ากับ 100% พอดี (ตอนนี้รวม ${total}%)` },
      { status: 400 }
    );
  }

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase ยังไม่ได้ตั้งค่าบนเซิร์ฟเวอร์นี้" }, { status: 503 });
  }

  const db = supabaseWriteClient();

  // Replace the whole list atomically-enough for this scale: delete all, insert all.
  const { error: delErr } = await db.from(WHEEL_TABLE).delete().gte("id", 0);
  if (delErr) {
    return NextResponse.json({ error: "ลบข้อมูลเดิมไม่สำเร็จ: " + delErr.message }, { status: 502 });
  }

  const { error: insErr } = await db.from(WHEEL_TABLE).insert(clean);
  if (insErr) {
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ: " + insErr.message }, { status: 502 });
  }

  return NextResponse.json({ prizes: clean, source: "supabase" });
}
