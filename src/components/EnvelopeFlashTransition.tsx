import { useEffect } from "react";
import { motion } from "framer-motion";

/** Συνολικός χρόνος overlay (snap hold + αργό fade-out λευκού). */
export const ENVELOPE_FLASH_TOTAL_MS = 1320;

/** Ξεκίνημα burn reveal (δευτερόλεπτα) — λίγο πριν αρχίσει να πέφτει το λευκό. */
export const BURN_REVEAL_DELAY_S = 0.1;
/** Διάρκεια «καψίματος» (επέκταση mask). */
export const BURN_REVEAL_DURATION_S = 1.05;
export const BURN_REVEAL_EASE: [number, number, number, number] = [0.12, 0.88, 0.2, 1];

/** Fallback χωρίς burn (μόνο linear fade container) — reduced motion. */
export const HARBOR_VIDEO_FADE_DELAY_S = 0.08;
export const HARBOR_VIDEO_FADE_DURATION_S = 0.45;
export const HARBOR_VIDEO_FADE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Props = {
  reducedMotion: boolean;
  onFinished: () => void;
};

const TOTAL_MS_REDUCED = 320;

/**
 * Flashbang: σχεδόν ακαριαία πλήρες λευκό για κλάσμα δευτ., μετά αργό fade-out
 * ώστε να φαίνεται η επόμενη σκηνή από κάτω.
 */
export function EnvelopeFlashTransition({ reducedMotion, onFinished }: Props) {
  useEffect(() => {
    const ms = reducedMotion ? TOTAL_MS_REDUCED : ENVELOPE_FLASH_TOTAL_MS;
    const t = window.setTimeout(() => onFinished(), ms);
    return () => window.clearTimeout(t);
  }, [onFinished, reducedMotion]);

  if (reducedMotion) {
    return (
      <motion.div
        className="fixed inset-0 z-[200] bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        aria-hidden
      />
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-[200] bg-white pointer-events-auto"
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{
        duration: 1.18,
        times: [0, 0.035, 0.1, 1],
        ease: [0.25, 0.1, 0.25, 1],
      }}
    />
  );
}
