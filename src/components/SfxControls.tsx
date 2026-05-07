type Props = {
  /** 0–1, εφαρμόζεται σε hover/click SFX και intro one-shot. */
  volume: number;
  onVolumeChange: (value: number) => void;
};

function SfxVolumeIcon({ volume, className }: { volume: number; className?: string }) {
  const muted = volume < 0.04;
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
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      {!muted ? (
        <>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" className={volume < 0.2 ? "opacity-0" : "opacity-100"} />
          <path d="M17.66 6.34a8 8 0 0 1 0 11.32" className={volume < 0.45 ? "opacity-0" : "opacity-100"} />
        </>
      ) : (
        <path d="M13 9l6 6M19 9l-6 6" />
      )}
    </svg>
  );
}

/**
 * Ίδιο grid με MusicControls: στήλη `w-11` + strip που ανοίγει στο hover/focus.
 * Δεν παίζει selection sound στο slider ώστε να μην αυτο-ανατροφοδοτείται το SFX.
 */
export function SfxControls({ volume, onVolumeChange }: Props) {
  return (
    <div
      className="group/sfx flex h-11 flex-row items-center outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b14]"
      tabIndex={0}
      role="group"
      aria-label="Sound effects"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/18 bg-black/45 text-slate-200 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <span className="relative flex size-[22px] items-center justify-center">
          <SfxVolumeIcon
            volume={volume}
            className={`size-[22px] ${volume < 0.04 ? "text-slate-400 opacity-75" : "text-slate-200 opacity-95"}`}
          />
        </span>
      </div>
      <div className="flex min-h-9 max-h-9 min-w-0 max-w-0 flex-row items-center gap-1 overflow-hidden rounded-full border border-white/18 bg-black/50 py-1.5 pl-2 pr-2 shadow-[0_6px_22px_rgba(0,0,0,0.42)] backdrop-blur-md transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] opacity-0 pointer-events-none group-hover/sfx:max-w-[min(58vw,12.5rem)] group-hover/sfx:opacity-100 group-hover/sfx:pointer-events-auto group-focus-within/sfx:max-w-[min(58vw,12.5rem)] group-focus-within/sfx:opacity-100 group-focus-within/sfx:pointer-events-auto">
        <span
          className="shrink-0 select-none text-[15px] font-semibold leading-none tracking-tight text-slate-300 tabular-nums"
          aria-hidden
        >
          −
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="h-2 min-w-0 w-[min(40vw,9.25rem)] shrink cursor-pointer accent-amber-400"
          aria-label="Sound effects volume"
        />
        <span
          className="shrink-0 select-none text-[15px] font-semibold leading-none tracking-tight text-slate-300 tabular-nums"
          aria-hidden
        >
          +
        </span>
      </div>
    </div>
  );
}
