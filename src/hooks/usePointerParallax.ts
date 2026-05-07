import { useCallback, useMemo } from "react";
import { useMotionValue, useSpring } from "framer-motion";

type Opts = {
  /** Μέγιστη κλίση στις άκρες της οθόνης (degrees) — χαμηλά νούμερα όπως σε cinematic heroes */
  maxDeg: number;
  /** Μέγιστη μετατόπιση στις άκρες (px) — συνδυάζεται με tilt για «φωτογραφικό» parallax */
  maxShiftPx: number;
  disabled?: boolean;
};

type Point = { clientX: number; clientY: number };

/**
 * Parallax κοντά στο στυλ landing heroes (π.χ. Genshin home): ήρεμο, από το κέντρο της σκηνής,
 * συνδυασμός λεπτού translate + rotate — όχι pivot στον κέρσορα (που διαβάζεται σαν λάθος 3D).
 * @see https://genshin.hoyoverse.com/en/home
 */
export function usePointerParallax({ maxDeg, maxShiftPx, disabled }: Opts) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  /** Κανονικοποιημένος δείκτης [-0.5, 0.5] — volumetric φως / σκόνη ακολουθεί όπως σε promo heroes */
  const nxp = useMotionValue(0);
  const nyp = useMotionValue(0);

  const springConfig = useMemo(
    () =>
      disabled
        ? { stiffness: 520, damping: 48, mass: 0.45 }
        : {
            /* Αργή, βαριά «κάμερα» — λίγο inertia, χωρίς rubber-band */
            stiffness: 82,
            damping: 27,
            mass: 1.12,
          },
    [disabled],
  );

  const rotateX = useSpring(rx, springConfig);
  const rotateY = useSpring(ry, springConfig);
  const shiftX = useSpring(tx, springConfig);
  const shiftY = useSpring(ty, springConfig);
  const pointerNudgeX = useSpring(nxp, springConfig);
  const pointerNudgeY = useSpring(nyp, springConfig);

  const onPointerMove = useCallback(
    (e: Point) => {
      if (disabled || maxDeg <= 0) return;
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;

      nxp.set(nx);
      nyp.set(ny);

      /* Κοιτάμε ελαφρά προς τον κέρσορα • drift αντίστροφο (depth cue όπως σε multi-layer heroes) */
      rx.set(-ny * maxDeg * 2);
      ry.set(nx * maxDeg * 2);

      if (maxShiftPx > 0) {
        tx.set(-nx * maxShiftPx * 2);
        ty.set(-ny * maxShiftPx * 2);
      }
    },
    [disabled, maxDeg, maxShiftPx, nxp, nyp, rx, ry, tx, ty],
  );

  const reset = useCallback(() => {
    rx.set(0);
    ry.set(0);
    tx.set(0);
    ty.set(0);
    nxp.set(0);
    nyp.set(0);
  }, [nxp, nyp, rx, ry, tx, ty]);

  return {
    rotateX,
    rotateY,
    shiftX,
    shiftY,
    pointerNudgeX,
    pointerNudgeY,
    onPointerMove,
    reset,
  };
}
