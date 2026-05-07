import { useEffect, useRef } from "react";
import { useMotionValueEvent, type MotionValue } from "framer-motion";
import { LIGHT_DESK_FOCAL, LIGHT_WINDOW } from "../scene/lightAnchors";

type Props = {
  reducedMotion: boolean;
  pointerNudgeX: MotionValue<number>;
  pointerNudgeY: MotionValue<number>;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  phase: number;
  twinklePhase: number;
  twinkleHz: number;
  soft: boolean;
  ambient: boolean;
};

function beamGeometry(
  w: number,
  h: number,
  nx: number,
  ny: number,
  reducedMotion: boolean,
) {
  const m = reducedMotion ? 0 : 1;
  const sx = w * LIGHT_WINDOW.x + nx * w * 0.092 * m;
  const sy = h * LIGHT_WINDOW.y + ny * h * 0.062 * m;
  const fx = w * LIGHT_DESK_FOCAL.x + nx * w * 0.036 * m;
  const fy = h * LIGHT_DESK_FOCAL.y + ny * h * 0.03 * m;
  const dx = fx - sx;
  const dy = fy - sy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return { sx, sy, fx, fy, len, ux, uy };
}

function beamIntensity(
  px: number,
  py: number,
  w: number,
  h: number,
  nx: number,
  ny: number,
  reducedMotion: boolean,
): number {
  const { sx, sy, len, ux, uy } = beamGeometry(w, h, nx, ny, reducedMotion);
  const vx = px - sx;
  const vy = py - sy;
  const along = vx * ux + vy * uy;
  if (along < -len * 0.06 || along > len * 1.22) return 0.1;

  const aclamp = Math.max(0, Math.min(len * 1.14, along));
  const cx = sx + ux * aclamp;
  const cy = sy + uy * aclamp;
  const dist = Math.hypot(px - cx, py - cy);
  const cone = w * (0.09 + (along / len) * 0.14);
  const corridor = Math.exp(-(dist * dist) / (cone * cone));

  const axial = Math.sin(Math.PI * Math.max(0, Math.min(1, along / (len * 1.03))));
  return 0.38 + corridor * axial * 1.65;
}

function warmth(
  px: number,
  py: number,
  w: number,
  h: number,
  ambient: boolean,
  nx: number,
  ny: number,
  reducedMotion: boolean,
): number {
  const b = beamIntensity(px, py, w, h, nx, ny, reducedMotion);
  if (ambient) {
    return Math.min(1.12, 0.52 + b * 0.68);
  }
  return b;
}

/** Στη δέσμη — ποικιλία μεγεθών & μαλακά bokeh */
function spawnBeam(w: number, h: number, reducedMotion: boolean): Particle {
  const { sx, sy, len, ux, uy } = beamGeometry(w, h, 0, 0, reducedMotion);
  const px = -uy;
  const py = ux;
  const t = Math.random() * len * 1.14;
  const spread = (Math.random() - 0.5) * w * 0.18;
  const speedScale = (reducedMotion ? 0.38 : 1) * 0.65;

  const roll = Math.random();
  const soft = roll > 0.62;
  let r: number;
  if (!soft) {
    if (roll < 0.38) r = Math.random() * 0.65 + 0.28;
    else r = Math.random() * 1.35 + 0.85;
  } else {
    r = Math.random() * 3.2 + 1.35;
  }

  return {
    x: sx + ux * t + px * spread + (Math.random() - 0.5) * w * 0.08,
    y: sy + uy * t + py * spread + Math.random() * h * 0.72,
    vx: (-ux * 0.038 + (Math.random() - 0.5) * 0.092) * speedScale,
    vy: (-uy * 0.038 + (Math.random() - 0.5) * 0.088 - 0.068) * speedScale,
    r,
    a: (soft ? 0.2 : 0.26) + Math.random() * (soft ? 0.32 : 0.48),
    phase: Math.random() * Math.PI * 2,
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleHz: 0.18 + Math.random() * 0.42,
    soft,
    ambient: false,
  };
}

/** Τυχαία θέση ambient με έμφαση κάτω / πλάγια */
function randomAmbientPosition(w: number, h: number) {
  const z = Math.random();
  if (z < 0.32) {
    return {
      x: Math.random() * w,
      y: h * (0.5 + Math.random() * 0.5),
    };
  }
  if (z < 0.5) {
    return {
      x: Math.random() * (w * 0.26),
      y: Math.random() * h,
    };
  }
  if (z < 0.68) {
    return {
      x: w * (0.74 + Math.random() * 0.26),
      y: Math.random() * h,
    };
  }
  return { x: Math.random() * w, y: Math.random() * h };
}

function spawnAmbient(w: number, h: number, reducedMotion: boolean): Particle {
  const speedScale = (reducedMotion ? 0.32 : 1) * 0.65;
  const soft = Math.random() < 0.52;
  const r = soft ? Math.random() * 3.8 + 0.95 : Math.random() * 1.15 + 0.32;
  const { x, y } = randomAmbientPosition(w, h);

  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 0.048 * speedScale,
    vy: ((Math.random() - 0.5) * 0.042 - 0.028) * speedScale,
    r,
    a: (soft ? 0.14 : 0.22) + Math.random() * 0.34,
    phase: Math.random() * Math.PI * 2,
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleHz: 0.12 + Math.random() * 0.38,
    soft,
    ambient: true,
  };
}

function drawSoftParticle(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  cx: number,
  cy: number,
  rr: number,
  alpha: number,
  warm: number,
) {
  const outer = rr * (2.05 + (p.r % 1) * 0.35);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, outer);
  const cg = Math.round(238 - warm * 26);
  const cb = Math.round(195 - warm * 42);
  const midA = alpha * 0.42;
  g.addColorStop(0, `rgba(255,${cg},${cb},${alpha})`);
  g.addColorStop(0.22, `rgba(255,${Math.round(cg - 8)},${Math.round(cb - 12)},${midA})`);
  g.addColorStop(0.55, `rgba(255,${Math.round(cg - 18)},${Math.round(cb - 20)},${midA * 0.55})`);
  g.addColorStop(1, `rgba(255,210,160,0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, outer, 0, Math.PI * 2);
  ctx.fill();
}

export function DustParticles({
  reducedMotion,
  pointerNudgeX,
  pointerNudgeY,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nxRef = useRef(0);
  const nyRef = useRef(0);

  useMotionValueEvent(pointerNudgeX, "change", (v) => {
    nxRef.current = v;
  });
  useMotionValueEvent(pointerNudgeY, "change", (v) => {
    nyRef.current = v;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return;

    let raf = 0;
    let particles: Particle[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = reducedMotion ? 112 : 410;
      const beamN = Math.round(count * 0.48);
      const ambN = count - beamN;
      const w = window.innerWidth;
      const h = window.innerHeight;
      particles = [
        ...Array.from({ length: beamN }, () => spawnBeam(w, h, reducedMotion)),
        ...Array.from({ length: ambN }, () => spawnAmbient(w, h, reducedMotion)),
      ];
    };

    const tick = (tMs: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const nx = nxRef.current;
      const ny = nyRef.current;
      const drawOx = reducedMotion ? 0 : nx * w * 0.034;
      const drawOy = reducedMotion ? 0 : ny * h * 0.026;

      const secs = tMs / 1000;
      const phaseStep = reducedMotion ? 0.00245 : 0.00465;
      const bob = reducedMotion ? 0.0245 : 0.04;

      for (const p of particles) {
        p.phase += phaseStep;
        p.x += p.vx + Math.sin(p.phase * 0.48 + p.twinklePhase * 0.3) * bob;
        p.y += p.vy + Math.cos(p.phase * 0.39 + p.phase * 0.15) * bob * 0.72;

        if (p.y < -48 || p.y > h + 48 || p.x < -64 || p.x > w + 64) {
          Object.assign(p, p.ambient ? spawnAmbient(w, h, reducedMotion) : spawnBeam(w, h, reducedMotion));
        }

        const px = p.x + drawOx;
        const py = p.y + drawOy;

        const warm = warmth(px, py, w, h, p.ambient, nx, ny, reducedMotion);

        const t1 = Math.sin(secs * Math.PI * 2 * p.twinkleHz + p.twinklePhase);
        const t2 = Math.sin(secs * Math.PI * 2 * p.twinkleHz * 1.58 + p.phase * 0.62 + 1.1);
        const rawTw = 0.52 + 0.48 * (0.54 * t1 + 0.46 * t2);
        const twinkle = rawTw * rawTw * (3 - 2 * rawTw);

        const lit = Math.min(1.08, warm * twinkle);
        const alpha = Math.min(1, Math.max(0.06, p.a * lit * (p.ambient ? 0.93 : 1)));
        const rr = p.r * (0.78 + lit * 0.52);

        if (p.soft) {
          drawSoftParticle(ctx, p, px, py, rr, alpha, warm);
          if (!reducedMotion && lit > 0.62 && !p.ambient) {
            ctx.beginPath();
            ctx.fillStyle = `rgba(255,248,232,${Math.min(0.28, alpha * 0.35)})`;
            ctx.arc(px, py, rr * 0.35, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          const cg = Math.round(244 - warm * 28);
          const cb = Math.round(205 - warm * 48);
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,${cg},${cb},${alpha})`;
          ctx.arc(px, py, rr, 0, Math.PI * 2);
          ctx.fill();

          if (!reducedMotion && lit > 0.58 && rr > 0.42) {
            ctx.beginPath();
            ctx.fillStyle = `rgba(255,252,236,${Math.min(0.42, alpha * 0.48)})`;
            ctx.arc(px, py, rr * 0.38, 0, Math.PI * 2);
            ctx.fill();
          }

          if (!reducedMotion && lit > 0.72 && rr > 0.65) {
            ctx.beginPath();
            ctx.fillStyle = `rgba(255,236,200,${alpha * 0.2})`;
            ctx.arc(px, py, rr * 2.1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      raf = window.requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(raf);
    };
  }, [reducedMotion, pointerNudgeX, pointerNudgeY]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[6] opacity-100 mix-blend-screen"
      style={{ pointerEvents: "none" }}
      aria-hidden
    />
  );
}
