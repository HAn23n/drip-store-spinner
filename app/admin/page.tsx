"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  DEFAULTS,
  PALETTE,
  Prize,
  PrizeColor,
  normalizePrizes,
  normalizeWeightsTo100,
  rebalanceWeights,
  renderWheel,
  weightSum,
} from "@/lib/wheel-shared";

export default function AdminPage() {
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
  }, []);

  useEffect(() => {
    redrawPreview(draft);
  }, [draft, redrawPreview]);

  function updateField(i: number, key: keyof Prize, value: string) {
    setDraft((prev) => {
      const next = prev.slice();
      const row = { ...next[i] } as Prize;
      if (key === "weight") {
        // Keep only digits and a decimal point (so a pasted "12.5" rounds to
        // 13 instead of the dot getting stripped and gluing the digits into
        // "125"), and let the field go empty (weight 0) while the owner is
        // mid-typing — don't force it back to 1 on every keystroke, that's
        // what made clearing the field to type a new number fight back. The
        // 1-100 floor/ceiling and rebalance only run once they leave the
        // field, in commitWeight below.
        const filtered = value.replace(/[^0-9.]/g, "").slice(0, 6);
        const num = filtered === "" || filtered === "." ? 0 : parseFloat(filtered);
        row.weight = Number.isFinite(num) ? Math.min(999, Math.round(num)) : 0;
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

  // Runs once the shop owner leaves the % field (not on every keystroke, so
  // typing a multi-digit number doesn't get interrupted): shrinks/grows every
  // other row proportionally so the list still sums to exactly 100%.
  function commitWeight(i: number) {
    setDraft((prev) => rebalanceWeights(prev, i, prev[i].weight || 1));
  }

  function addRow() {
    setDraft((prev) =>
      normalizeWeightsTo100([
        ...prev,
        { label: "รางวัลใหม่", description: "", color: "espresso", weight: 1, sort_order: prev.length },
      ])
    );
  }

  function deleteRow(i: number) {
    if (draft.length <= 2) {
      alert("ต้องเหลืออย่างน้อย 2 ช่อง");
      return;
    }
    setDraft((prev) => normalizeWeightsTo100(prev.filter((_, idx) => idx !== i)));
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
      if (weightSum(clean) !== 100) {
        alert("โอกาสรวมต้องเท่ากับ 100% พอดี");
        return;
      }
      const res = await fetch("/api/admin/prizes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prizes: clean }),
      });
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

  if (loading) {
    return (
      <main className="screen active">
        <p className="sub">กำลังโหลด…</p>
      </main>
    );
  }

  const totalPct = weightSum(draft);
  const totalOk = totalPct === 100;

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
        <p>แก้ชื่อ คำอธิบาย สี และโอกาสออกเป็น % ของแต่ละช่องได้ แก้ช่องไหน ช่องอื่นจะปรับให้รวมกันเป็น 100% เสมอ</p>
        <p
          className="store-note"
          role="status"
          aria-live="polite"
          style={{ color: totalOk ? "var(--leaf)" : "var(--cherry)", opacity: 1, fontWeight: 600 }}
        >
          โอกาสรวม {totalPct}% {totalOk ? "✓ ครบ 100%" : totalPct > 100 ? `(เกิน ${totalPct - 100}%)` : `(ขาดอีก ${100 - totalPct}%)`}
        </p>
        <p className="store-note">{storeNote}</p>
        <p className="store-note">
          <Link href="/admin/history" style={{ color: "inherit", textDecoration: "underline" }}>
            ดูประวัติการหมุน
          </Link>
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
          return (
            <div className="row" key={i}>
              <div className="row-top">
                <span className="swatch" style={{ background: pal.hex }} />
                <strong>ช่องที่ {i + 1}</strong>
                <span className="pct">โอกาส {p.weight}%</span>
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
                  <label>โอกาส (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9.]*"
                    maxLength={6}
                    value={p.weight === 0 ? "" : p.weight}
                    onChange={(e) => updateField(i, "weight", e.target.value)}
                    onBlur={() => commitWeight(i)}
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
        <button className="btn btn-gold" onClick={save} disabled={saving || !totalOk}>
          {saving ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </div>
      <div className="admin-actions" style={{ marginTop: 10 }}>
        <button className="btn btn-ghost" onClick={resetToDefaults}>
          รีเซ็ตกลับค่าเริ่มต้น
        </button>
      </div>
      <div className={"toast" + (savedNote ? " show" : "")} role="status" aria-live="polite">
        {savedNote}
      </div>
    </main>
  );
}
