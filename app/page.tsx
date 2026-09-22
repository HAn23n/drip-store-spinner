"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Prize,
  WHEEL_C,
  pickIndex,
  renderWheel,
} from "@/lib/wheel-shared";

const SPIN_SPEED = 240; // deg/s while spinning, waiting for the player to tap stop

type Phase = "idle" | "spinning" | "stopping";

export default function WheelPage() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [spinCount, setSpinCount] = useState(0);
  const [btnLabel, setBtnLabel] = useState("กำลังโหลด…");
  const [btnDisabled, setBtnDisabled] = useState(true);
  const [modal, setModal] = useState<Prize | null>(null);

  const wheelGroupRef = useRef<SVGGElement | null>(null);
  const prizesRef = useRef<Prize[]>([]);
  const rotationRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const spinRAFRef = useRef<number | null>(null);
  const spinLastTsRef = useRef(0);
  const modalCloseRef = useRef<HTMLButtonElement | null>(null);
  const spinBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    prizesRef.current = prizes;
  }, [prizes]);

  const applyRotation = useCallback(() => {
    const g = wheelGroupRef.current;
    if (!g) return;
    g.setAttribute("transform", `rotate(${rotationRef.current.toFixed(2)} ${WHEEL_C} ${WHEEL_C})`);
  }, []);

  const redrawWheel = useCallback(() => {
    renderWheel(wheelGroupRef.current, prizesRef.current);
    applyRotation();
  }, [applyRotation]);

  function reducedMotion() {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  const finish = useCallback((idx: number) => {
    setSpinCount((c) => c + 1);
    setBtnDisabled(false);
    setBtnLabel("หมุนวงล้อ");
    const p = prizesRef.current[idx];
    setModal(p);
  }, []);

  const stopSpin = useCallback(() => {
    if (spinRAFRef.current) cancelAnimationFrame(spinRAFRef.current);
    phaseRef.current = "stopping";
    setBtnDisabled(true);
    setBtnLabel("กำลังหยุด…");

    const list = prizesRef.current;
    const idx = pickIndex(list);
    const segDeg = 360 / list.length;
    const targetDeg = -90 - (idx * segDeg + segDeg / 2);
    const shortest = (((targetDeg - rotationRef.current) % 360) + 360) % 360;
    // Always add one full turn so there is enough distance to decelerate smoothly.
    const D = shortest + 360;

    if (reducedMotion()) {
      rotationRef.current += D;
      applyRotation();
      phaseRef.current = "idle";
      finish(idx);
      return;
    }

    // Constant-deceleration ease: starts exactly at SPIN_SPEED (the spinning
    // speed) and decelerates linearly to zero right at the target, so there is
    // no jump in speed at the moment the player taps stop.
    const v0 = SPIN_SPEED;
    const durMs = ((2 * D) / v0) * 1000; // from D = v0*T/2
    const from = rotationRef.current;
    const start = performance.now();

    const frame = (now: number) => {
      const t = Math.min((now - start) / durMs, 1);
      const eased = 2 * t - t * t; // derivative at t=0 equals v0 exactly
      rotationRef.current = from + D * eased;
      applyRotation();
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        phaseRef.current = "idle";
        finish(idx);
      }
    };
    requestAnimationFrame(frame);
  }, [applyRotation, finish]);

  const startSpin = useCallback(() => {
    phaseRef.current = "spinning";
    setBtnLabel("แตะเพื่อหยุด!");

    if (reducedMotion()) {
      stopSpin();
      return;
    }

    spinLastTsRef.current = performance.now();
    const loop = (ts: number) => {
      if (phaseRef.current !== "spinning") return;
      const dt = (ts - spinLastTsRef.current) / 1000;
      spinLastTsRef.current = ts;
      rotationRef.current = (rotationRef.current + SPIN_SPEED * dt) % 360;
      applyRotation();
      spinRAFRef.current = requestAnimationFrame(loop);
    };
    spinRAFRef.current = requestAnimationFrame(loop);
  }, [applyRotation, stopSpin]);

  const spinBtnClick = useCallback(() => {
    if (prizesRef.current.length < 2) return;
    if (phaseRef.current === "idle") startSpin();
    else if (phaseRef.current === "spinning") stopSpin();
    // "stopping": ignore repeat taps while decelerating.
  }, [startSpin, stopSpin]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/prizes", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        setPrizes(data.prizes ?? []);
      } finally {
        if (!cancelled) {
          setBtnDisabled(false);
          setBtnLabel("หมุนวงล้อ");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    redrawWheel();
  }, [prizes, redrawWheel]);

  useEffect(() => {
    if (modal) modalCloseRef.current?.focus();
  }, [modal]);

  function closeModal() {
    setModal(null);
    spinBtnRef.current?.focus();
  }

  return (
    <main className="screen active" id="screen-wheel">
      <div className="topbar">
        <div className="brand">
          DRIP STORE
          <br />
          โคกโพธิ์ · ปัตตานี
        </div>
        <Link className="icon-btn" href="/admin" aria-label="แก้ไขวงล้อ">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
          </svg>
        </Link>
      </div>

      <div className="hero">
        <h1>
          หมุน<em>ลุ้น</em>โชค
        </h1>
        <p className="sub">กดเพื่อหมุน แล้วแตะอีกครั้งเพื่อหยุดเอง หมุนได้ไม่จำกัด</p>
      </div>

      <div className="wheel-wrap">
        <svg className="pointer" viewBox="0 0 32 40" aria-hidden="true">
          <path d="M16 40 L1 9 A16 16 0 0 1 31 9 Z" fill="#c1544a" stroke="#211208" strokeWidth={2} />
        </svg>
        <svg id="wheel" viewBox="0 0 300 300" role="img" aria-label="วงล้อรางวัล">
          <g id="wheelGroup" ref={wheelGroupRef} />
        </svg>
        <div className="hub" aria-hidden="true">
          ☕️
        </div>
      </div>

      <div className="spin-area">
        <button ref={spinBtnRef} className="btn btn-gold" id="spinBtn" onClick={spinBtnClick} disabled={btnDisabled}>
          {btnLabel}
        </button>
        <p className="count" id="count">
          หมุนไปแล้ว <b>{spinCount}</b> ครั้ง
        </p>
      </div>

      <p className="foot">แคปหน้าจอผลรางวัลแสดงพนักงานหน้าร้านเพื่อรับสิทธิ์</p>

      <div className={"overlay" + (modal ? " show" : "")} role="dialog" aria-modal="true">
        <div className="modal">
          <div className="emo">{modal?.color === "leaf" ? "☕️" : "🎉"}</div>
          <p className="cap">คุณได้รับ</p>
          <p className="prize">{modal?.label ?? "—"}</p>
          <p className="desc">{modal?.description || "แคปหน้าจอนี้แสดงพนักงานเพื่อรับสิทธิ์"}</p>
          <button
            ref={modalCloseRef}
            className="btn btn-gold"
            style={{ padding: "12px 32px", fontSize: 15 }}
            onClick={closeModal}
          >
            หมุนอีกครั้ง
          </button>
        </div>
      </div>
    </main>
  );
}
