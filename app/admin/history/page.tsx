"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface SpinRow {
  id: number;
  label: string;
  description: string;
  spun_at: string;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function HistoryPage() {
  const [rows, setRows] = useState<SpinRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/spins?page=${p}`, { cache: "no-store" });
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setPageSize(data.pageSize ?? 5);
      setPage(data.page ?? p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  async function exportExcel() {
    setExporting(true);
    try {
      const res = await fetch("/api/spins/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "ส่งออกไม่สำเร็จ");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spin-history-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("ส่งออกไม่สำเร็จ: " + (err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="screen active" id="screen-history">
      <div className="topbar">
        <div className="brand">ประวัติการหมุน</div>
        <Link className="icon-btn" href="/admin" aria-label="กลับไปหน้าแก้ไขวงล้อ">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
      </div>

      <div className="admin-head">
        <h2>ประวัติการหมุน</h2>
        <p>รายการผลรางวัลทุกครั้งที่มีคนหมุนวงล้อ ทั้งหมด {total} ครั้ง</p>
      </div>

      <div className="admin-actions" style={{ marginBottom: 18 }}>
        <button className="btn btn-ghost" onClick={exportExcel} disabled={exporting || total === 0}>
          {exporting ? "กำลังส่งออก…" : "ส่งออกเป็น Excel"}
        </button>
      </div>

      {loading ? (
        <p className="sub">กำลังโหลด…</p>
      ) : rows.length === 0 ? (
        <p className="sub">ยังไม่มีประวัติการหมุน</p>
      ) : (
        <>
          <div className="history-list">
            {rows.map((r) => (
              <div className="row history-row" key={r.id}>
                <div className="history-row-top">
                  <strong>{r.label}</strong>
                  <span className="pct">{formatDateTime(r.spun_at)}</span>
                </div>
                {r.description ? <p className="history-desc">{r.description}</p> : null}
              </div>
            ))}
          </div>

          <div className="pagination" role="navigation" aria-label="เปลี่ยนหน้าประวัติการหมุน">
            <button className="btn btn-ghost" onClick={() => load(page - 1)} disabled={page <= 1}>
              ก่อนหน้า
            </button>
            <span className="pagination-info">
              หน้า {page} จาก {totalPages}
            </span>
            <button className="btn btn-ghost" onClick={() => load(page + 1)} disabled={page >= totalPages}>
              ถัดไป
            </button>
          </div>
        </>
      )}
    </main>
  );
}
