import { NextResponse } from "next/server";
import { hasSupabaseConfig, supabaseReadClient, WHEEL_TABLE } from "@/lib/supabase-admin";
import { DEFAULTS, normalizePrizes } from "@/lib/wheel-shared";
import { NO_STORE } from "@/lib/http";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Public: the spin page loads the prize list from here on every visit. Every
// response explicitly disables caching (belt-and-suspenders on top of
// dynamic/revalidate above) so a save in /admin is never masked by a stale
// response from a CDN or proxy sitting between Vercel and the browser.
export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      {
        prizes: normalizePrizes(DEFAULTS),
        source: "fallback",
        message: "ยังไม่ได้ตั้งค่า Supabase — ใช้รายการรางวัลเริ่มต้น",
      },
      NO_STORE
    );
  }

  try {
    const { data, error } = await supabaseReadClient()
      .from(WHEEL_TABLE)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          prizes: normalizePrizes(DEFAULTS),
          source: "fallback",
          message: "ตาราง wheel_prizes ยังไม่มีข้อมูล — ใช้รายการรางวัลเริ่มต้น",
        },
        NO_STORE
      );
    }
    return NextResponse.json({ prizes: normalizePrizes(data), source: "supabase", message: "" }, NO_STORE);
  } catch (err) {
    return NextResponse.json(
      {
        prizes: normalizePrizes(DEFAULTS),
        source: "fallback",
        message: "เชื่อมต่อ Supabase ไม่สำเร็จ (" + (err as Error).message + ") — ใช้รายการรางวัลเริ่มต้นชั่วคราว",
      },
      NO_STORE
    );
  }
}
