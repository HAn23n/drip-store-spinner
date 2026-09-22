import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { hasSupabaseConfig, supabaseWriteClient, SPIN_HISTORY_TABLE } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Downloads the full spin history as an .xlsx file.
export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase ยังไม่ได้ตั้งค่าบนเซิร์ฟเวอร์นี้" }, { status: 503 });
  }

  const { data, error } = await supabaseWriteClient()
    .from(SPIN_HISTORY_TABLE)
    .select("label, description, spun_at")
    .order("spun_at", { ascending: false })
    .limit(10000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const rows = (data ?? []).map((r) => ({
    "รางวัลที่ได้": r.label,
    "รายละเอียด": r.description,
    "วันเวลาที่หมุน": new Date(r.spun_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [{ wch: 22 }, { wch: 40 }, { wch: 22 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "ประวัติการหมุน");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="spin-history-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
