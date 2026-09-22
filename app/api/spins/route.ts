import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseConfig, supabaseWriteClient, SPIN_HISTORY_TABLE } from "@/lib/supabase-admin";
import { NO_STORE } from "@/lib/http";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const PAGE_SIZE = 5;

// Records one completed spin. Called by the wheel page right after a result
// lands. Both reads and writes for this table go through the service_role
// key (see supabase/migrations/0002_spin_history.sql) — the anon key has no
// access, so a visitor can't forge history rows directly against Supabase.
export async function POST(req: NextRequest) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const label = String((body as { label?: unknown })?.label ?? "").trim().slice(0, 24);
  const description = String((body as { description?: unknown })?.description ?? "").trim();
  if (!label) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  const { error } = await supabaseWriteClient().from(SPIN_HISTORY_TABLE).insert({ label, description });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ rows: [], total: 0, page: 1, pageSize: PAGE_SIZE }, NO_STORE);
  }

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await supabaseWriteClient()
    .from(SPIN_HISTORY_TABLE)
    .select("id, label, description, spun_at", { count: "exact" })
    .order("spun_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502, ...NO_STORE });
  }

  return NextResponse.json({ rows: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE }, NO_STORE);
}
