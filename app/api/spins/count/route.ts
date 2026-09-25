import { NextResponse } from "next/server";
import { hasSupabaseConfig, supabaseWriteClient, SPIN_HISTORY_TABLE } from "@/lib/supabase-admin";
import { NO_STORE } from "@/lib/http";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Just the cumulative spin count — used by the public wheel page to seed its
// "หมุนไปแล้ว X ครั้ง" display. Deliberately separate from GET /api/spins
// (the paginated admin history listing): that endpoint also fetches and
// serializes history rows a display counter doesn't need, and is the wrong
// thing for a public page to depend on if the admin history feature ever
// grows auth of its own.
export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ total: 0 }, NO_STORE);
  }
  const { count, error } = await supabaseWriteClient()
    .from(SPIN_HISTORY_TABLE)
    .select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502, ...NO_STORE });
  }
  return NextResponse.json({ total: count ?? 0 }, NO_STORE);
}
