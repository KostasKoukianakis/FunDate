import { useCallback, useEffect, useRef, useState } from "react";

const REVEAL_MS = 5200;

type ObjectPositionPct = { xPct: number; yPct: number };

function parseObjectPosition(css: string | undefined): ObjectPositionPct {
  if (!css?.trim()) return { xPct: 50, yPct: 50 };
  const parts = css.trim().split(/\s+/);
  const pct = (s: string) => {
    const m = s.match(/^([\d.]+)%$/);
    if (!m) return 50;
    const n = Number(m[1]);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50;
  };
  if (parts.length >= 2) return { xPct: pct(parts[0]), yPct: pct(parts[1]) };
  return { xPct: 50, yPct: 50 };
}

/** Matches demo “ASYMMETRY” splatter: high radius variance, 10 segments. */
function drawOrganicStroke(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  const segments = 10;
  const radius = size;
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const dist = radius * (0.4 + Math.random() * 0.8);
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number,
  pos: ObjectPositionPct,
) {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh) return;
  const ir = nw / nh;
  const cr = cw / ch;
  let dw: number;
  let dh: number;
  let ox: number;
  let oy: number;
  if (ir > cr) {
    dh = ch;
    dw = ch * ir;
    oy = 0;
    ox = (cw - dw) * (pos.xPct / 100);
  } else {
    dw = cw;
    dh = cw / ir;
    ox = 0;
    oy = (ch - dh) * (pos.yPct / 100);
  }
  ctx.drawImage(img, ox, oy, dw, dh);
}

const NATIVE_OVERLAY_IMG_CLASS =
  "pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover select-none";

/** Same box as the overlay `<img>`; `object-cover` only applies on the image element. */
const CANVAS_WRAP_CLASS =
  "pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-hidden select-none";

type Props = {
  src: string;
  reducedMotion: boolean;
  /** Total time for organic mask to reach full reveal (ms). */
  revealMs?: number;
  /** Optional CSS `object-position` for `object-cover`; omit to match default framing (no inline style). */
  objectPosition?: string;
  /**
   * When false, show the overlay as a plain `<img>` (no canvas organic reveal).
   * Use for any path other than the farewell «Back to desk» control.
   */
  organicReveal?: boolean;
};

/**
 * Directional organic reveal (from directional demo): mask accumulates frame-by-frame; each
 * frame adds biased strokes (top-left early, bottom-right late), then `destination-in` over
 * a full-bleed `object-cover` draw. Desk base stays HTML underneath.
 */
export function DeskOptionCanvasReveal({
  src,
  reducedMotion,
  revealMs = REVEAL_MS,
  objectPosition,
  organicReveal = true,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const logicalSizeRef = useRef({ w: 0, h: 0 });
  const loopStartedRef = useRef(false);
  const [revealComplete, setRevealComplete] = useState(false);

  useEffect(() => {
    setRevealComplete(false);
  }, [src, organicReveal]);

  const resizeCanvases = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const w = Math.max(1, Math.round(wrap.clientWidth || wrap.getBoundingClientRect().width));
    const h = Math.max(1, Math.round(wrap.clientHeight || wrap.getBoundingClientRect().height));
    logicalSizeRef.current = { w, h };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    canvas.width = bw;
    canvas.height = bh;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    if (!maskCanvasRef.current) maskCanvasRef.current = document.createElement("canvas");
    if (!tempCanvasRef.current) tempCanvasRef.current = document.createElement("canvas");
    maskCanvasRef.current.width = bw;
    maskCanvasRef.current.height = bh;
    tempCanvasRef.current.width = bw;
    tempCanvasRef.current.height = bh;
  }, []);

  useEffect(() => {
    if (reducedMotion || !organicReveal || revealComplete) return;
    const img = new Image();
    img.decoding = "async";
    img.src = src;

    let cancelled = false;

    const pos = parseObjectPosition(objectPosition);

    const run = () => {
      if (cancelled || loopStartedRef.current) return;
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap || !img.complete || !img.naturalWidth) return;

      resizeCanvases();

      const maskCanvas = maskCanvasRef.current;
      const tempCanvas = tempCanvasRef.current;
      if (!maskCanvas || !tempCanvas) return;

      loopStartedRef.current = true;
      const ctx = canvas.getContext("2d");
      const maskCtx = maskCanvas.getContext("2d");
      const tempCtx = tempCanvas.getContext("2d");
      if (!ctx || !maskCtx || !tempCtx) {
        loopStartedRef.current = false;
        return;
      }

      const computeDpr = () => canvas.width / Math.max(1, logicalSizeRef.current.w);

      const dpr0 = computeDpr();
      ctx.setTransform(dpr0, 0, 0, dpr0, 0, 0);
      maskCtx.setTransform(dpr0, 0, 0, dpr0, 0, 0);
      const { w: cw0, h: ch0 } = logicalSizeRef.current;
      maskCtx.clearRect(0, 0, cw0, ch0);
      startRef.current = performance.now();

      const tick = (now: number) => {
        if (cancelled) {
          loopStartedRef.current = false;
          return;
        }
        const { w: cw, h: ch } = logicalSizeRef.current;
        if (cw < 2 || ch < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const elapsed = now - startRef.current;
        const dpr = computeDpr();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cw, ch);

        if (elapsed >= revealMs) {
          drawImageCover(ctx, img, cw, ch, pos);
          loopStartedRef.current = false;
          if (!cancelled) setRevealComplete(true);
          return;
        }

        const biasP = Math.min(1, elapsed / revealMs);
        const currentReveal = Math.min(1.2, (elapsed / revealMs) * 1.2);

        const centerX = cw / 2;
        const centerY = ch / 2;
        const maxRadius = Math.max(cw, ch) * 0.7;

        maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        maskCtx.fillStyle = "black";
        maskCtx.globalCompositeOperation = "source-over";

        for (let i = 0; i < 25; i++) {
          const angle = Math.random() * Math.PI * 2;
          const tlBias = Math.exp(-((angle - 3.92) ** 2) / 1.5) * (1 - biasP);
          const brBias = Math.exp(-((angle - 0.78) ** 2) / 1.5) * biasP;
          const directionWeight = Math.max(0.2, 1 + tlBias * 2.5 + brBias * 2.5);
          const noise = 0.8 + Math.random() * 0.4;
          const reach = maxRadius * currentReveal * directionWeight * noise;
          const dist = reach * Math.random();
          const px = centerX + Math.cos(angle) * dist;
          const py = centerY + Math.sin(angle) * dist;
          const strokeSize = 15 + Math.random() * 40 * (1 + biasP);
          drawOrganicStroke(maskCtx, px, py, strokeSize);
        }

        tempCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        tempCtx.clearRect(0, 0, cw, ch);
        tempCtx.globalCompositeOperation = "source-over";
        drawImageCover(tempCtx, img, cw, ch, pos);
        tempCtx.globalCompositeOperation = "destination-in";
        tempCtx.drawImage(maskCanvas, 0, 0, maskCanvas.width, maskCanvas.height, 0, 0, cw, ch);

        const glowPhase = Math.min(1, elapsed / revealMs);
        ctx.save();
        ctx.shadowBlur = 20 * Math.sin(glowPhase * Math.PI);
        ctx.shadowColor = "rgba(168, 85, 247, 0.4)";
        ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, cw, ch);
        ctx.restore();

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    let kickScheduled = false;
    const kick = () => {
      if (cancelled || kickScheduled || !img.complete || !img.naturalWidth) return;
      kickScheduled = true;
      requestAnimationFrame(() => {
        kickScheduled = false;
        run();
      });
    };

    img.onload = () => kick();
    img.onerror = () => {
      /* missing asset — leave canvas empty */
    };
    const bootId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) kick();
      });
    });

    const ro = new ResizeObserver(() => {
      if (cancelled || !img.complete) return;
      resizeCanvases();
    });
    const wrap = wrapRef.current;
    if (wrap) ro.observe(wrap);

    return () => {
      cancelled = true;
      loopStartedRef.current = false;
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(bootId);
    };
  }, [src, reducedMotion, revealMs, objectPosition, resizeCanvases, revealComplete, organicReveal]);

  if (reducedMotion || !organicReveal) {
    return (
      <img
        key={src}
        src={src}
        alt=""
        aria-hidden
        draggable={false}
        className={NATIVE_OVERLAY_IMG_CLASS}
        style={objectPosition ? { objectPosition } : undefined}
      />
    );
  }

  if (revealComplete) {
    return (
      <img
        key={src}
        src={src}
        alt=""
        aria-hidden
        draggable={false}
        className={NATIVE_OVERLAY_IMG_CLASS}
        style={objectPosition ? { objectPosition } : undefined}
      />
    );
  }

  return (
    <div
      ref={wrapRef}
      className={CANVAS_WRAP_CLASS}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 block h-full w-full"
        aria-hidden
      />
    </div>
  );
}
