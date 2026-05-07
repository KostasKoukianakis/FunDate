export type WpGgDesign = {
  leftPx: number;
  topPx: number;
  skewX: number;
  skewY: number;
  rotateX: number;
  rotateZ: number;
  rotateY: number;
  /** Τρίτο όριο του clamp() για τον τίτλο GG WP (rem). */
  titleMaxRem: number;

  /** Κύριο κείμενο (π.χ. «GG WP»). */
  wpTitle: string;
  /** Μικρές γραμμές κάτω από τον τίτλο· κενή γραμμή = δεν εμφανίζεται. */
  wpSubLine1: string;
  wpSubLine2: string;
  wpSubLine3: string;

  /** Κλίμακα όλων των offsets/blur του τίτλου (1 = όπως τα px). */
  tsShadowScale: number;
  /** Γωνία extrusion: 0° = δεξιά, 90° = κάτω (οθόνη). */
  tsExtrudeAngleDeg: number;
  /** Μέγισο μήκος σωρού extrusion κατά μήκος της ακτίνας (px). */
  tsExtrudeDepthPx: number;
  /** Πλήθος σκληρών στρώσεων (βήματα). */
  tsExtrudeSteps: number;
  tsExtrudeColor: string;
  tsExtrudeOpStart: number;
  tsExtrudeOpEnd: number;
  /**
   * Προσομοίωση «spread»: εναλλασσόμενη μετατόπιση κάθετα στην ακτίνα (px).
   * Το CSS text-shadow δεν έχει spread· χρησιμοποιούμε μικρή κάθετη μετατόπιση.
   */
  tsExtrudeSpreadPx: number;

  tsFaceRimBlurPx: number;
  tsFaceRimOpacity: number;
  tsFaceRimColor: string;
  tsFaceHaloBlurPx: number;
  tsFaceHaloOpacity: number;
  tsFaceHaloColor: string;

  tsSoft1AlongPx: number;
  tsSoft1BlurPx: number;
  tsSoft1Opacity: number;
  tsSoft1Color: string;
  tsSoft2AlongPx: number;
  tsSoft2BlurPx: number;
  tsSoft2Opacity: number;
  tsSoft2Color: string;
  tsSoft3AlongPx: number;
  tsSoft3BlurPx: number;
  tsSoft3Opacity: number;
  tsSoft3Color: string;

  tsAmbientBlurPx: number;
  tsAmbientOpacity: number;
  tsAmbientColor: string;

  /** Υπότιτλοι — ίδια λογική, συμπαγές σετ. */
  ssShadowScale: number;
  ssExtrudeAngleDeg: number;
  ssExtrudeDepthPx: number;
  ssExtrudeSteps: number;
  ssExtrudeColor: string;
  ssExtrudeOpStart: number;
  ssExtrudeOpEnd: number;
  ssExtrudeSpreadPx: number;
  ssFaceRimBlurPx: number;
  ssFaceRimOpacity: number;
  ssFaceRimColor: string;
  ssSoftAlongPx: number;
  ssSoftBlurPx: number;
  ssSoftOpacity: number;
  ssSoftColor: string;
  ssGlowBlurPx: number;
  ssGlowOpacity: number;
  ssGlowColor: string;
};

/** Defaults GG WP — θέση, transform, σκιές, κείμενα. */
export const WP_GG_DEFAULTS: WpGgDesign = {
  leftPx: 706,
  topPx: 318,
  skewX: 25,
  skewY: 12.5,
  rotateX: -16,
  rotateZ: -30.5,
  rotateY: 15,
  titleMaxRem: 12,

  wpTitle: "GG WP",
  wpSubLine1: "So we're aiming for outside—first, a few messages to catch a time that suits you",
  wpSubLine2: "Same easy chat for where to meet and anything worth asking before we go",
  wpSubLine3: "Coffee, a walk, something simple—the rest can take shape while we talk",

  tsShadowScale: 0.6,
  tsExtrudeAngleDeg: 90,
  tsExtrudeDepthPx: 7.25,
  tsExtrudeSteps: 1,
  tsExtrudeColor: "#0e101e",
  tsExtrudeOpStart: 0.96,
  tsExtrudeOpEnd: 0.9,
  tsExtrudeSpreadPx: 0,

  tsFaceRimBlurPx: 1,
  tsFaceRimOpacity: 0.42,
  tsFaceRimColor: "#fffcf8",
  tsFaceHaloBlurPx: 2,
  tsFaceHaloOpacity: 0.08,
  tsFaceHaloColor: "#7896d2",

  tsSoft1AlongPx: 12,
  tsSoft1BlurPx: 12,
  tsSoft1Opacity: 0.42,
  tsSoft1Color: "#000000",
  tsSoft2AlongPx: 15.56,
  tsSoft2BlurPx: 26,
  tsSoft2Opacity: 0.32,
  tsSoft2Color: "#000000",
  tsSoft3AlongPx: 19.8,
  tsSoft3BlurPx: 42,
  tsSoft3Opacity: 0.22,
  tsSoft3Color: "#000000",

  tsAmbientBlurPx: 48,
  tsAmbientOpacity: 0.14,
  tsAmbientColor: "#283c64",

  ssShadowScale: 1,
  ssExtrudeAngleDeg: 45,
  ssExtrudeDepthPx: 2.5,
  ssExtrudeSteps: 4,
  ssExtrudeColor: "#10101c",
  ssExtrudeOpStart: 0.9,
  ssExtrudeOpEnd: 0.92,
  ssExtrudeSpreadPx: 0,
  ssFaceRimBlurPx: 1,
  ssFaceRimOpacity: 0.2,
  ssFaceRimColor: "#fffcf8",
  ssSoftAlongPx: 3.54,
  ssSoftBlurPx: 8,
  ssSoftOpacity: 0.4,
  ssSoftColor: "#000000",
  ssGlowBlurPx: 14,
  ssGlowOpacity: 0.12,
  ssGlowColor: "#283755",
};

function clamp01(a: number): number {
  return Math.min(1, Math.max(0, a));
}

/** #RRGGBB + opacity → rgba() */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, "").trim();
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(0,0,0,${clamp01(alpha)})`;
    return `rgba(${r},${g},${b},${clamp01(alpha)})`;
  }
  return `rgba(0,0,0,${clamp01(alpha)})`;
}

function fmt(n: number): string {
  const x = Math.round(n * 1000) / 1000;
  return Number.isInteger(x) ? String(x) : x.toFixed(3).replace(/\.?0+$/, "");
}

function vecAlongAngleDeg(angleDeg: number, alongPx: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(rad) * alongPx, y: Math.sin(rad) * alongPx };
}

function vecPerpAlongAngleDeg(angleDeg: number, perpPx: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: -Math.sin(rad) * perpPx, y: Math.cos(rad) * perpPx };
}

export function buildWpTitleTextShadow(d: WpGgDesign): string {
  const s = d.tsShadowScale;
  const layers: string[] = [];

  if (d.tsFaceRimBlurPx > 0 && d.tsFaceRimOpacity > 0) {
    layers.push(`0 0 ${fmt(d.tsFaceRimBlurPx * s)}px ${hexToRgba(d.tsFaceRimColor, d.tsFaceRimOpacity)}`);
  }
  if (d.tsFaceHaloBlurPx > 0 && d.tsFaceHaloOpacity > 0) {
    layers.push(`0 0 ${fmt(d.tsFaceHaloBlurPx * s)}px ${hexToRgba(d.tsFaceHaloColor, d.tsFaceHaloOpacity)}`);
  }

  const steps = Math.max(1, Math.round(d.tsExtrudeSteps));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const along = d.tsExtrudeDepthPx * t * s;
    const { x: bx, y: by } = vecAlongAngleDeg(d.tsExtrudeAngleDeg, along);
    const alt = i % 2 === 0 ? 1 : -1;
    const { x: px, y: py } = vecPerpAlongAngleDeg(d.tsExtrudeAngleDeg, d.tsExtrudeSpreadPx * s * alt * t);
    const op = d.tsExtrudeOpStart + (d.tsExtrudeOpEnd - d.tsExtrudeOpStart) * t;
    layers.push(`${fmt(bx + px)}px ${fmt(by + py)}px 0 ${hexToRgba(d.tsExtrudeColor, op)}`);
  }

  const pushSoft = (alongPx: number, blurPx: number, op: number, color: string) => {
    if (blurPx <= 0 || op <= 0) return;
    const { x, y } = vecAlongAngleDeg(d.tsExtrudeAngleDeg, alongPx * s);
    layers.push(`${fmt(x)}px ${fmt(y)}px ${fmt(blurPx * s)}px ${hexToRgba(color, op)}`);
  };
  pushSoft(d.tsSoft1AlongPx, d.tsSoft1BlurPx, d.tsSoft1Opacity, d.tsSoft1Color);
  pushSoft(d.tsSoft2AlongPx, d.tsSoft2BlurPx, d.tsSoft2Opacity, d.tsSoft2Color);
  pushSoft(d.tsSoft3AlongPx, d.tsSoft3BlurPx, d.tsSoft3Opacity, d.tsSoft3Color);

  if (d.tsAmbientBlurPx > 0 && d.tsAmbientOpacity > 0) {
    layers.push(`0 0 ${fmt(d.tsAmbientBlurPx * s)}px ${hexToRgba(d.tsAmbientColor, d.tsAmbientOpacity)}`);
  }

  return layers.length ? layers.join(", ") : "0 0 0 transparent";
}

export function buildWpSubTextShadow(d: WpGgDesign): string {
  const s = d.ssShadowScale;
  const layers: string[] = [];

  if (d.ssFaceRimBlurPx > 0 && d.ssFaceRimOpacity > 0) {
    layers.push(`0 0 ${fmt(d.ssFaceRimBlurPx * s)}px ${hexToRgba(d.ssFaceRimColor, d.ssFaceRimOpacity)}`);
  }

  const steps = Math.max(1, Math.round(d.ssExtrudeSteps));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const along = d.ssExtrudeDepthPx * t * s;
    const { x: bx, y: by } = vecAlongAngleDeg(d.ssExtrudeAngleDeg, along);
    const alt = i % 2 === 0 ? 1 : -1;
    const { x: px, y: py } = vecPerpAlongAngleDeg(d.ssExtrudeAngleDeg, d.ssExtrudeSpreadPx * s * alt * t);
    const op = d.ssExtrudeOpStart + (d.ssExtrudeOpEnd - d.ssExtrudeOpStart) * t;
    layers.push(`${fmt(bx + px)}px ${fmt(by + py)}px 0 ${hexToRgba(d.ssExtrudeColor, op)}`);
  }

  if (d.ssSoftBlurPx > 0 && d.ssSoftOpacity > 0) {
    const { x, y } = vecAlongAngleDeg(d.ssExtrudeAngleDeg, d.ssSoftAlongPx * s);
    layers.push(`${fmt(x)}px ${fmt(y)}px ${fmt(d.ssSoftBlurPx * s)}px ${hexToRgba(d.ssSoftColor, d.ssSoftOpacity)}`);
  }
  if (d.ssGlowBlurPx > 0 && d.ssGlowOpacity > 0) {
    layers.push(`0 0 ${fmt(d.ssGlowBlurPx * s)}px ${hexToRgba(d.ssGlowColor, d.ssGlowOpacity)}`);
  }

  return layers.length ? layers.join(", ") : "0 0 0 transparent";
}
