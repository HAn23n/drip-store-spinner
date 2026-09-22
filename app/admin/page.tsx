"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULTS, PALETTE, Prize, PrizeColor, normalizePrizes, renderWheel } from "@/lib/wheel-shared";

export default function AdminPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeNote, setStoreNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState("");
  const previewGroupRef = useRef<SVGGElement | null>(null);

  const redrawPreview = useCallback((list: Prize[]) => {
    renderWheel(
      previewGroupRef.current,
      list.filter((p) => String(p.label).trim())
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/prizes", { cache: "no-store" });
        if (res.status === 401) {
          router.replace("/admin/login?next=/admin");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setDraft(data.prizes ?? []);
        setStoreNote(
          data.source === "supabase"
            ? "เชื่อมต่อ Supabase แล้ว การแก้ไขจะเห็นตรงกันทุกเครื่อง"
            : "ยังไม่ได้ตั้งค่า Supabase (หรือยังไม่มีข้อมูล) — บันทึกจะไม่ถูกเก็บถาวร"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    redrawPreview(draft);
  }, [draft, redrawPreview]);

  function updateField(i: number, key: keyof Prize, value: string) {
    setDraft((prev) => {
      const next = prev.slice();
      const row = { ...next[i] } as Prize;
      if (key === "weight") {
        row.weight = Math.max(1, Number(value) || 1);
      } else if (key === "color") {
        row.color = value as PrizeColor;
      } else if (key === "label") {
        row.label = value;
      } else if (key === "description") {
        row.description = value;
      }
      next[i] = row;
      return next;
    });
  }

  function addRow() {
    setDraft((prev) => [...prev, { label: "รางวัลใหม่", description: "", color: "espresso", weight: 1, sort_order: prev.length }]);
  }

  function deleteRow(i: number) {
    if (draft.length <= 2) {
      alert("ต้องเหลืออย่างน้อย 2 ช่อง");
      return;
    }
    setDraft((prev) => prev.filter((_, idx) => idx !== i));
  }

  function resetToDefaults() {
    if (!confirm("รีเซ็ตรายการรางวัลกลับเป็นค่าเริ่มต้น?")) return;
    setDraft(JSON.parse(JSON.stringify(DEFAULTS)));
  }

  async function save() {
    setSaving(true);
    setSavedNote("");
    try {
      const clean = normalizePrizes(draft);
      if (clean.length < 2) {
        alert("ต้องมีอย่างน้อย 2 ช่อง");
        return;
      }
      const res = await fetch("/api/admin/prizes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prizes: clean }),
      });
      if (res.status === 401) {
        router.replace("/admin/login?next=/admin");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setDraft(data.prizes);
      setSavedNote("บันทึกขึ้น Supabase แล้ว");
      setTimeout(() => setSavedNote(""), 2800);
    } catch (err) {
      alert("บันทึกไม่สำเร็จ: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  if (loading) {
    return (
      <main className="screen active">
        <p className="sub">กำลังโหลด…</p>
      </main>
    );
  }

  const total = draft.reduce((s, p) => s + (Number(p.weight) || 1), 0) || 1;

  return (
    <main className="screen active" id="screen-admin">
      <div className="topbar">
        <div className="brand">แก้ไขวงล้อ</div>
        <Link className="icon-btn" href="/" aria-label="กลับไปหน้าหมุน">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
      </div>

      <div className="admin-head">
        <h2>รายการรางวัล</h2>
        <p>แก้ชื่อ คำอธิบาย สี และน้ำหนักโอกาสออกได้ ยิ่งน้ำหนักมาก ยิ่งออกบ่อย</p>
        <p className="store-note">
          {storeNote}
          {" · "}
          <button
            type="button"
            onClick={logout}
            style={{ background: "none", border: "none", padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
          >
            ออกจากระบบ
          </button>
        </p>
      </div>

      <div className="preview-row">
        <svg viewBox="0 0 300 300" aria-hidden="true">
          <g ref={previewGroupRef} />
        </svg>
      </div>

      <div className="rows-grid" id="rows">
        {draft.map((p, i) => {
          const pal = PALETTE[p.color] || PALETTE.espresso;
          const pct = Math.round(((Number(p.weight) || 1) / total) * 1000) / 10;
          return (
            <div className="row" key={i}>
              <div className="row-top">
                <span className="swatch" style={{ background: pal.hex }} />
                <strong>ช่องที่ {i + 1}</strong>
                <span className="pct">โอกาส {pct}%</span>
                <button className="del" aria-label={`ลบช่องที่ ${i + 1}`} onClick={() => deleteRow(i)}>
                  ✕
                </button>
              </div>
              <div className="field">
                <label>ชื่อรางวัล</label>
                <input
                  value={p.label}
                  maxLength={24}
                  onChange={(e) => updateField(i, "label", e.target.value)}
                />
              </div>
              <div className="field">
                <label>คำอธิบาย</label>
                <textarea value={p.description} onChange={(e) => updateField(i, "description", e.target.value)} />
              </div>
              <div className="pair">
                <div className="field">
                  <label>สี</label>
                  <select value={p.color} onChange={(e) => updateField(i, "color", e.target.value)}>
                    {Object.keys(PALETTE).map((key) => (
                      <option key={key} value={key}>
                        {PALETTE[key as PrizeColor].name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>น้ำหนักโอกาส</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={999}
                    value={p.weight}
                    onChange={(e) => updateField(i, "weight", e.target.value)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="admin-actions">
        <button className="btn btn-ghost" onClick={addRow}>
          + เพิ่มช่อง
        </button>
        <button className="btn btn-gold" onClick={save} disabled={saving}>
          {saving ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </div>
      <div className="admin-actions" style={{ marginTop: 10 }}>
        <button className="btn btn-ghost" onClick={resetToDefaults}>
          รีเซ็ตกลับค่าเริ่มต้น
        </button>
      </div>
      <p className={"saved-note" + (savedNote ? " show" : "")}>{savedNote}</p>
    </main>
  );
}
