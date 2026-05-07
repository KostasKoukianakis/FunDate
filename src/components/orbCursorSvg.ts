import cursorDefaultRaw from "../../public/cursor.svg?raw";
import cursorHoverRaw from "../../public/cursor_hover.svg?raw";

/** Scope `id="gN"` / `url(#gN)` για κάθε N στο SVG (default έως g12, hover έως g31+). */
function scopeGradientIds(svg: string, idPrefix: string): string {
  const nums = new Set<number>();
  for (const m of svg.matchAll(/\bid="g(\d+)"\b/g)) {
    nums.add(Number(m[1]));
  }
  let s = svg;
  const sorted = [...nums].sort((a, b) => b - a);
  for (const n of sorted) {
    const id = `g${n}`;
    const scoped = `${idPrefix}${n}`;
    s = s.replaceAll(`id="${id}"`, `id="${scoped}"`);
    s = s.replaceAll(`url(#${id})`, `url(#${scoped})`);
  }
  return s;
}

type SvgOpenOpts = {
  matchOpen: string;
  viewBox: string;
  width: number;
  height: number;
};

function finalizeOrbSvg(scopedSvg: string, p: string, reducedMotion: boolean, opts: SvgOpenOpts): string {
  let s = scopedSvg;

  const heatFilterId = `orbheat${p}`;
  const turbulenceAnim = reducedMotion
    ? ""
    : `<animate attributeName="baseFrequency" dur="6.5s" values="0.052;0.068;0.056;0.064;0.052" repeatCount="indefinite" />
    <animate attributeName="seed" dur="2.8s" values="1;6;3;8;1" repeatCount="indefinite" />`;

  const displacementScale = reducedMotion ? "1" : "1.65";

  const filterBlock = `
<filter id="${heatFilterId}" x="-48%" y="-48%" width="196%" height="196%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.056" numOctaves="2" result="orbnoise" seed="3">
    ${turbulenceAnim}
  </feTurbulence>
  <feDisplacementMap in="SourceGraphic" in2="orbnoise" scale="${displacementScale}" xChannelSelector="R" yChannelSelector="G" />
</filter>`;

  s = s.replace("</defs>", `${filterBlock}</defs>`);

  s = s.replace(
    opts.matchOpen,
    `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="${opts.viewBox}" width="${opts.width}" height="${opts.height}" class="orb-cursor-svg" filter="url(#${heatFilterId})" style="overflow:visible;display:block" aria-hidden="true">`,
  );

  return s;
}

/**
 * Inline SVG default cursor (`cursor.svg`) — scoped ids + animated displacement.
 */
export function buildOrbCursorSvgHtml(reactId: string, reducedMotion: boolean): string {
  const p = reactId.replace(/[^a-zA-Z0-9]/g, "") || "o";
  const scoped = scopeGradientIds(cursorDefaultRaw, `orbg${p}`);
  return finalizeOrbSvg(scoped, p, reducedMotion, {
    matchOpen: '<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 187 201" width="500" height="537">',
    viewBox: "0 0 187 201",
    width: 48,
    height: 52,
  });
}

/**
 * Inline SVG όταν το pointer είναι πάνω από interactive στοιχείο (`cursor_hover.svg`).
 */
export function buildOrbCursorHoverSvgHtml(reactId: string, reducedMotion: boolean): string {
  const p = reactId.replace(/[^a-zA-Z0-9]/g, "") || "o";
  const scoped = scopeGradientIds(cursorHoverRaw, `orbg${p}`);
  return finalizeOrbSvg(scoped, p, reducedMotion, {
    matchOpen: '<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 770 877" width="500" height="569">',
    viewBox: "0 0 770 877",
    width: 46,
    height: 52,
  });
}
