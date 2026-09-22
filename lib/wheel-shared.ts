// Shared between the public spin page and the admin edit page.
// Kept close to the original single-file prototype's constants on purpose.

export type PrizeColor = "espresso" | "gold" | "cherry" | "leaf";

export interface Prize {
  id?: number;
  label: string;
  description: string;
  color: PrizeColor;
  weight: number;
  sort_order: number;
}

export const PALETTE: Record<PrizeColor, { hex: string; text: string; name: string }> = {
  espresso: { hex: "#432515", text: "#f6ecdc", name: "น้ำตาลเข้ม" },
  gold: { hex: "#d9a441", text: "#211208", name: "ทอง" },
  cherry: { hex: "#c1544a", text: "#f6ecdc", name: "แดงเชอร์รี่" },
  leaf: { hex: "#7c9a5e", text: "#211208", name: "เขียวใบไม้" },
};

// weight is a whole-number percentage (1-100); across all prizes it must sum
// to exactly 100, so it can be shown to the shop owner directly as "โอกาส %"
// instead of an abstract relative weight.
export const DEFAULTS: Prize[] = [
  { label: "ส่วนลด 5 บาท", description: "หักส่วนลด 5 บาท เมื่อสั่งเครื่องดื่มใดก็ได้", color: "espresso", weight: 55, sort_order: 0 },
  { label: "น้ำฟรี 1 แก้ว", description: "รับเครื่องดื่มเมนูปกติฟรี 1 แก้ว", color: "gold", weight: 3, sort_order: 1 },
  { label: "ลดอาหาร 10%", description: "ส่วนลด 10% สำหรับเมนูอาหารในร้าน", color: "espresso", weight: 10, sort_order: 2 },
  { label: "ฟรีท็อปปิ้ง", description: "เพิ่มท็อปปิ้งฟรี 1 อย่างในเครื่องดื่ม", color: "cherry", weight: 7, sort_order: 3 },
  { label: "ลด 15 บาท", description: "หักส่วนลด 15 บาท เมื่อสั่งเครื่องดื่มใดก็ได้", color: "espresso", weight: 20, sort_order: 4 },
  { label: "ลุ้นใหม่รอบหน้า", description: "รอบนี้ยังไม่ถูกรางวัล ลองหมุนอีกครั้งได้เลย", color: "leaf", weight: 5, sort_order: 5 },
];

export function normalizePrizes(list: Partial<Prize>[]): Prize[] {
  return list
    .filter((p) => p && String(p.label ?? "").trim())
    .map((p, i) => ({
      label: String(p.label).trim().slice(0, 24),
      description: String(p.description ?? "").trim(),
      color: (p.color && PALETTE[p.color as PrizeColor] ? p.color : "espresso") as PrizeColor,
      weight: Math.max(1, Math.min(100, Math.round(Number(p.weight) || 1))),
      sort_order: i,
    }));
}

export function weightSum(list: Prize[]): number {
  return list.reduce((s, p) => s + (Number(p.weight) || 0), 0);
}

// SVG coordinate system (viewBox 300x300), matches the original prototype.
export const WHEEL_R = 145;
export const WHEEL_C = 150;
const WHEEL_HUBR = WHEEL_R * 0.28;
const WHEEL_PAD = 14;
export const WHEEL_ANCHOR_R = WHEEL_R - WHEEL_PAD;
export const WHEEL_TEXT_LEN = Math.max(22, WHEEL_ANCHOR_R - WHEEL_HUBR - 12);

export function escXml(s: unknown): string {
  return String(s ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m] as string));
}

export function fontSizeForLabel(label: string): number {
  const len = Array.from(String(label || "")).length;
  if (len <= 8) return 24;
  if (len <= 12) return 20;
  if (len <= 17) return 16;
  if (len <= 22) return 13;
  return 11;
}

export function buildWheelMarkup(list: Prize[]): string {
  const n = list.length || 1;
  const segDeg = 360 / n;
  let wedges = "";
  let texts = "";

  list.forEach((p, i) => {
    const pal = PALETTE[p.color] || PALETTE.espresso;
    const startDeg = i * segDeg;
    const endDeg = (i + 1) * segDeg;
    const midDeg = startDeg + segDeg / 2;
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;
    const x1 = WHEEL_C + WHEEL_R * Math.cos(startRad);
    const y1 = WHEEL_C + WHEEL_R * Math.sin(startRad);
    const x2 = WHEEL_C + WHEEL_R * Math.cos(endRad);
    const y2 = WHEEL_C + WHEEL_R * Math.sin(endRad);
    const largeArc = segDeg > 180 ? 1 : 0;

    wedges +=
      '<path d="M' + WHEEL_C + "," + WHEEL_C +
      " L" + x1.toFixed(2) + "," + y1.toFixed(2) +
      " A" + WHEEL_R + "," + WHEEL_R + " 0 " + largeArc + ",1 " + x2.toFixed(2) + "," + y2.toFixed(2) +
      ' Z" fill="' + pal.hex + '" stroke="rgba(33,18,8,.5)" stroke-width="1.4"/>';

    const label = String(p.label || "").trim() || "—";
    const fs = fontSizeForLabel(label);
    texts +=
      '<text x="' + (WHEEL_C + WHEEL_ANCHOR_R).toFixed(2) + '" y="' + WHEEL_C + '" ' +
      'transform="rotate(' + midDeg.toFixed(3) + " " + WHEEL_C + " " + WHEEL_C + ')" ' +
      'text-anchor="end" dominant-baseline="middle" data-fs0="' + fs + '" ' +
      'font-size="' + fs + '" font-weight="600" fill="' + pal.text + '">' +
      escXml(label) +
      "</text>";
  });

  return wedges + texts;
}

// Forces every wedge label to fit WHEEL_TEXT_LEN by shrinking font-size based on
// the real rendered width (getComputedTextLength), then falls back to squeezing
// glyphs with textLength only if still too wide at the floor size.
export function fixupTextFit(group: SVGGElement | null): void {
  if (!group) return;
  const floorFs = 8;
  const measure = (t: SVGTextElement) => {
    try {
      return t.getComputedTextLength();
    } catch {
      return 0;
    }
  };
  group.querySelectorAll("text").forEach((el) => {
    const t = el as SVGTextElement;
    const fs0 = parseFloat(t.getAttribute("data-fs0") || "") || parseFloat(t.getAttribute("font-size") || "") || 16;
    let fs = fs0;
    t.removeAttribute("textLength");
    t.removeAttribute("lengthAdjust");
    t.setAttribute("font-size", fs.toFixed(1));

    let natural = measure(t);
    let guard = 0;
    while (natural > WHEEL_TEXT_LEN && fs > floorFs && guard++ < 20) {
      fs = Math.max(floorFs, fs * (WHEEL_TEXT_LEN / natural) * 0.96);
      t.setAttribute("font-size", fs.toFixed(1));
      natural = measure(t);
    }

    if (natural > WHEEL_TEXT_LEN) {
      t.setAttribute("textLength", WHEEL_TEXT_LEN.toFixed(1));
      t.setAttribute("lengthAdjust", "spacingAndGlyphs");
    }
  });
}

export function renderWheel(group: SVGGElement | null, list: Prize[]): void {
  if (!group) return;
  group.innerHTML = buildWheelMarkup(list);
  fixupTextFit(group);
}

export function pickIndex(prizes: Prize[]): number {
  const total = prizes.reduce((s, p) => s + p.weight, 0);
  let x = Math.random() * total;
  for (let i = 0; i < prizes.length; i++) {
    x -= prizes[i].weight;
    if (x <= 0) return i;
  }
  return prizes.length - 1;
}
