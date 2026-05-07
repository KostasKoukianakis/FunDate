import { motion } from "framer-motion";
import { useUiButtonSounds } from "../hooks/useUiButtonSounds";

type Props = {
  reducedMotion: boolean;
  onSkip: () => void;
};

function SkipToEndIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M5 5v14l8-7-8-7zm9 0v14l8-7-8-7z"
      />
    </svg>
  );
}

/** Άλμα στο τελικό loop (scene_3) χωρίς αναμονή harbor / scene_2. */
export function SceneSkipToEndButton({ reducedMotion, onSkip }: Props) {
  const ui = useUiButtonSounds();
  return (
    <motion.button
      type="button"
      onPointerEnter={ui.onPointerEnter}
      onFocus={ui.onFocus}
      onClick={ui.wrapClick(onSkip)}
      whileHover={reducedMotion ? undefined : { scale: 1.06 }}
      whileTap={reducedMotion ? undefined : { scale: 0.94 }}
      aria-label="Άλμα στο τελικό βίντεο — scene 3 loop"
      title="Άλμα στο τέλος"
      className="relative grid size-11 place-items-center rounded-full border border-sky-300/30 bg-black/50 text-sky-100/95 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors hover:border-sky-300/45 hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300/80"
    >
      <SkipToEndIcon className="size-[20px]" />
    </motion.button>
  );
}
