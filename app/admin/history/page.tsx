"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { bangkokDateStamp } from "@/lib/http";

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
  const [exportBusy, setExportBusy] = useState(false);
  const exportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
    };
  }, []);

  // The download itself is a plain link (not fetch+blob+click) so it works on
  // mobile browsers that silently fail the JS-triggered-blob pattern — but
  // that means there's no "download finished" event to clear a busy state
  // from, so this just debounces rapid double-clicks for a few seconds
  // instead of tracking real completion.
  function handleExportClick() {
    setExportBusy(true);
    exportTimerRef.current = setTimeout(() => setExportBusy(false), 4000);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const exportDisabled = total === 0 || exportBusy;

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
        {/*
          Always an <a>, never swapped for a <button> — a screen reader should
          announce the same role regardless of state, and code that queries
          this control by role shouldn't have to handle two different tags.
          It's a plain link (not fetch+blob+programmatic click) so the
          browser's native download handling takes it — the JS-triggered
          blob-click pattern silently fails to download on iOS Safari and
          several Android in-app browsers.
        */}
        <a
          className={"btn btn-ghost" + (exportDisabled ? " btn-disabled" : "")}
          href={exportDisabled ? undefined : "/api/spins/export"}
          aria-disabled={exportDisabled}
          onClick={(e) => {
            if (exportDisabled) e.preventDefault();
            else handleExportClick();
          }}
          download={`spin-history-${bangkokDateStamp()}.xlsx`}
        >
          {exportBusy ? "กำลังส่งออก…" : "ส่งออกเป็น Excel"}
        </a>
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
