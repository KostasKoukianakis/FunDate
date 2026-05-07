import { motion } from "framer-motion";
import { useUiButtonSounds } from "../hooks/useUiButtonSounds";

type Props = {
  enabled: boolean;
  onToggle: () => void;
  /** Default: fixed top-left. `panel` = μέσα σε MusicControls (χωρίς fixed). */
  variant?: "fixed" | "panel";
};

function NoteIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9 18V5l10-2v11" />
      <circle cx={7} cy={18} r={3} />
      <circle cx={17} cy={16} r={3} />
    </svg>
  );
}

export function MusicToggle({ enabled, onToggle, variant = "fixed" }: Props) {
  const ui = useUiButtonSounds();
  const positionClass =
    variant === "panel"
      ? "relative z-0"
      : "fixed left-4 top-4 z-[120] sm:left-6 sm:top-6";

  return (
    <motion.button
      type="button"
      onPointerEnter={ui.onPointerEnter}
      onFocus={ui.onFocus}
      onClick={ui.wrapClick(() => onToggle())}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      aria-label={enabled ? "Mute music" : "Unmute music"}
      aria-pressed={enabled}
      className={`${positionClass} grid size-11 place-items-center rounded-full border border-white/18 bg-black/45 text-slate-200 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors hover:border-white/28 hover:bg-black/55 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400`}
    >
      <span className="relative flex size-[22px] items-center justify-center">
        <NoteIcon
          className={`size-[22px] ${enabled ? "text-slate-200 opacity-95" : "text-slate-400 opacity-75"}`}
        />
        {!enabled ? (
          <span
            className="pointer-events-none absolute -bottom-px -right-px flex size-[13px] items-center justify-center rounded-full bg-red-600 ring-[2.5px] ring-[#070b14]"
            aria-hidden
          >
            <span className="h-[1.5px] w-[9px] rounded-full bg-white rotate-[-42deg]" />
          </span>
        ) : null}
      </span>
    </motion.button>
  );
}
