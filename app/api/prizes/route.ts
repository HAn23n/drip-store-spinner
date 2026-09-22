import { NextResponse } from "next/server";
import { hasSupabaseConfig, supabaseReadClient, WHEEL_TABLE } from "@/lib/supabase-admin";
import { DEFAULTS, normalizePrizes } from "@/lib/wheel-shared";

export const dynamic = "force-dynamic";

// Public: the spin page loads the prize list from here on every visit.
export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({
      prizes: normalizePrizes(DEFAULTS),
      source: "fallback",
      message: "ยังไม่ได้ตั้งค่า Supabase — ใช้รายการรางวัลเริ่มต้น",
    });
  }

  try {
    const { data, error } = await supabaseReadClient()
      .from(WHEEL_TABLE)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({
        prizes: normalizePrizes(DEFAULTS),
        source: "fallback",
        message: "ตาราง wheel_prizes ยังไม่มีข้อมูล — ใช้รายการรางวัลเริ่มต้น",
      });
    }
    return NextResponse.json({ prizes: normalizePrizes(data), source: "supabase", message: "" });
  } catch (err) {
    return NextResponse.json({
      prizes: normalizePrizes(DEFAULTS),
      source: "fallback",
      message: "เชื่อมต่อ Supabase ไม่สำเร็จ (" + (err as Error).message + ") — ใช้รายการรางวัลเริ่มต้นชั่วคราว",
    });
  }
}
