/**
 * Δέσμη φωτός — στατικά anchors (χωρίς cursor-driven motion για απόδοση).
 * Το parallax του δείκτη μένει στα DustParticles + tilt όλης της σκηνής.
 */
import {
  LIGHT_DESK_FOCAL,
  LIGHT_WINDOW,
  lightBeamVolumeMask,
  pct,
} from "../scene/lightAnchors";

type Props = {
  reducedMotion: boolean;
};

export function GodRays({ reducedMotion }: Props) {
  const anim = reducedMotion ? "" : "desk-god-rays-anim";
  const LX = pct(LIGHT_WINDOW.x);
  const LY = pct(LIGHT_WINDOW.y);
  const FX = pct(LIGHT_DESK_FOCAL.x);
  const FY = pct(LIGHT_DESK_FOCAL.y);

  const beamMask = lightBeamVolumeMask();

  /*
   * Λεπτότερα από την αρχική έκδοση, αλλά αρκετά φαρδιά ώστε το cone να χτυπά τη μάσκα.
   * Τα ultra-narrow wedges έκαναν τις δέσμες σχεδόν αόρατες με mix-blend-screen.
   */
  const threeShafts = `conic-gradient(from 258deg at ${LX} ${LY},
      transparent 232deg,
      rgba(255, 234, 198, 0.58) 238deg,
      rgba(255, 206, 150, 0.26) 248deg,
      rgba(255, 228, 182, 0.38) 258deg,
      transparent 266deg,
      transparent 270deg,
      rgba(255, 226, 186, 0.38) 276deg,
      rgba(255, 188, 132, 0.17) 286deg,
      rgba(255, 218, 168, 0.24) 294deg,
      transparent 302deg,
      transparent 306deg,
      rgba(255, 236, 200, 0.36) 312deg,
      rgba(255, 212, 158, 0.19) 322deg,
      rgba(255, 238, 198, 0.21) 332deg,
      transparent 340deg,
      transparent 360deg)`;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[4]"
      style={{
        maskImage: beamMask,
        WebkitMaskImage: beamMask,
      }}
      aria-hidden
    >
      <div
        className={`pointer-events-none absolute inset-0 ${anim === "" ? "" : "desk-god-rays-sun"}`}
        style={{
          opacity: 1,
          background: `
            radial-gradient(ellipse 72% 82% at ${LX} -8%,
              rgba(255, 244, 218, 0.46) 0%,
              rgba(255, 218, 168, 0.15) 44%,
              transparent 68%)
          `,
        }}
      />

      <div
        className={`desk-god-rays-ambient pointer-events-none absolute inset-[-28%] mix-blend-screen ${anim}`}
        style={{
          transformOrigin: `${LX} ${LY}`,
          opacity: 0.42,
          filter: "blur(14px)",
          WebkitFilter: "blur(14px)",
          background: `
            conic-gradient(from 256deg at ${LX} ${LY},
              transparent 0deg,
              rgba(255, 214, 168, 0.34) 42deg,
              rgba(255, 196, 138, 0.22) 72deg,
              rgba(255, 222, 178, 0.14) 102deg,
              transparent 138deg,
              transparent 360deg)
          `,
        }}
      />

      <div
        className={`desk-god-rays-shafts-halo pointer-events-none absolute inset-[-30%] mix-blend-screen ${anim}`}
        style={{
          transformOrigin: `${LX} ${LY}`,
          opacity: 0.62,
          filter: "blur(12px)",
          WebkitFilter: "blur(12px)",
          background: threeShafts,
        }}
      />

      <div
        className={`desk-god-rays-shafts-main pointer-events-none absolute inset-[-28%] mix-blend-soft-light ${anim}`}
        style={{
          transformOrigin: `${LX} ${LY}`,
          opacity: 1,
          background: threeShafts,
        }}
      />

      <div
        className={`desk-god-rays-shafts-screen pointer-events-none absolute inset-[-28%] mix-blend-screen ${anim}`}
        style={{
          transformOrigin: `${LX} ${LY}`,
          opacity: 0.45,
          background: threeShafts,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 1,
          background: `
            radial-gradient(ellipse 52% 48% at ${FX} ${FY},
              rgba(255, 212, 158, 0.34) 0%,
              rgba(255, 186, 122, 0.09) 50%,
              transparent 72%)
          `,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 z-[9] mix-blend-screen opacity-[0.22]"
        style={{
          background: `
            radial-gradient(ellipse 42% 44% at ${FX} ${FY},
              rgba(255, 224, 182, 0.46) 0%,
              transparent 58%)
          `,
        }}
      />
    </div>
  );
}
