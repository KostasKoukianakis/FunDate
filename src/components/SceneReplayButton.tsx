import { motion } from "framer-motion";
import { useUiButtonSounds } from "../hooks/useUiButtonSounds";

type Props = {
  reducedMotion: boolean;
  onReplay: () => void;
};

function ReplayIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 12a9 9 0 1 0 3-7.1" />
      <path d="M3 4v4h4" />
    </svg>
  );
}

/** Επανάληψη ροής μετά το άνοιγμα φακέλου — επιστροφή στο desk. */
export function SceneReplayButton({ reducedMotion, onReplay }: Props) {
  const ui = useUiButtonSounds();
  return (
    <motion.button
      type="button"
      onPointerEnter={ui.onPointerEnter}
      onFocus={ui.onFocus}
      onClick={ui.wrapClick(onReplay)}
      whileHover={reducedMotion ? undefined : { scale: 1.06 }}
      whileTap={reducedMotion ? undefined : { scale: 0.94 }}
      aria-label="Ξανά από την αρχή — ίδια ροή με το άνοιγμα του φακέλου (flash, harbor, επιλογές)"
      title="Replay φακέλου"
      className="relative grid size-11 place-items-center rounded-full border border-amber-200/25 bg-black/50 text-amber-100/95 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors hover:border-amber-200/40 hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300/80"
    >
      <ReplayIcon className="size-[22px]" />
    </motion.button>
  );
}
