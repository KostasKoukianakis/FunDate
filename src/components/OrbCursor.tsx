import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { isOrbInteractiveHoverTarget } from "./orbCursorInteractive";
import { buildOrbCursorHoverSvgHtml, buildOrbCursorSvgHtml } from "./orbCursorSvg";

const ORB_HTML_CLASS = "orb-cursor";

function finePointerInitially(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: fine)").matches;
}

/**
 * Custom κέρσορας: default `cursor.svg`, πάνω από links/buttons κ.λπ. `cursor_hover.svg`.
 * Aura + SVG στο ίδιο transform (χωρίς lag)· glow κάτω από το SVG.
 */
export function OrbCursor() {
  const reactId = useId();
  const reducedMotion = useReducedMotion();
  const followRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef({ x: -100, y: -100 });
  const hoverRef = useRef(false);
  const [showOrb] = useState(finePointerInitially);
  const [interactiveHover, setInteractiveHover] = useState(false);

  const defaultMarkup = useMemo(
    () => buildOrbCursorSvgHtml(reactId, !!reducedMotion),
    [reactId, reducedMotion],
  );
  const hoverMarkup = useMemo(
    () => buildOrbCursorHoverSvgHtml(reactId, !!reducedMotion),
    [reactId, reducedMotion],
  );

  useLayoutEffect(() => {
    if (!showOrb) return;
    document.documentElement.classList.add(ORB_HTML_CLASS);
    return () => {
      document.documentElement.classList.remove(ORB_HTML_CLASS);
    };
  }, [showOrb]);

  useLayoutEffect(() => {
    if (!showOrb) return;

    const onMove = (e: PointerEvent) => {
      pendingRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    const tick = () => {
      const t = pendingRef.current;
      const el = followRef.current;
      if (el) {
        el.style.transform = `translate3d(${t.x}px, ${t.y}px, 0)`;
      }

      const hit = document.elementFromPoint(t.x, t.y);
      const next = isOrbInteractiveHoverTarget(hit);
      if (next !== hoverRef.current) {
        hoverRef.current = next;
        setInteractiveHover(next);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [showOrb]);

  if (!showOrb) return null;

  const svgMarkup = interactiveHover ? hoverMarkup : defaultMarkup;
  const wrapClass = interactiveHover
    ? "orb-cursor-inline-wrap block h-[52px] w-[46px] shrink-0 select-none [&>svg]:h-full [&>svg]:w-full [&>svg]:max-w-none"
    : "orb-cursor-inline-wrap block h-[52px] w-12 shrink-0 select-none [&>svg]:h-full [&>svg]:w-full [&>svg]:max-w-none";

  return (
    <div className="pointer-events-none fixed inset-0 z-[2147483646] overflow-hidden" aria-hidden>
      <div
        ref={followRef}
        className={`orb-cursor-follow pointer-events-none fixed left-0 top-0 z-[2147483646]${interactiveHover ? " orb-cursor-follow--interactive" : ""}`}
        style={{ transform: "translate3d(-100px, -100px, 0)" }}
      >
        <div className="orb-cursor-aura-wrap pointer-events-none absolute left-0 top-0 z-0">
          <div className="orb-cursor-aura-pivot">
            <div className="orb-cursor-aura-stack">
              <div className="orb-cursor-aura-stack__body" />
              <div className="orb-cursor-aura-stack__vapor" aria-hidden />
            </div>
          </div>
        </div>
        <div className="orb-cursor-root pointer-events-none absolute left-0 top-0 z-[1]">
          <div className="orb-cursor-anchor">
            <div className="orb-cursor-flame">
              <span className={wrapClass} dangerouslySetInnerHTML={{ __html: svgMarkup }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
