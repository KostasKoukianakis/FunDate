import { MusicToggle } from "./MusicToggle";
import { playButtonSelectionSound } from "../audio/sfx";

type Props = {
  enabled: boolean;
  onToggle: () => void;
  /** 0–1, εφαρμόζεται στο desk loop (και κλιμάκωση air όταν ορίζεται από parent). */
  volume: number;
  onVolumeChange: (value: number) => void;
};

/**
 * Πρώτη στήλη ακριβώς `w-11` (ίδιο με replay/skip). Το `fixed` anchor το δίνει ο parent στο DeskScene.
 * Το slider μένει στο flex flow δεξιά (`max-w-0` → ανοίγει) ώστε το hover να καλύπτει και τη μπάρα.
 */
export function MusicControls({ enabled, onToggle, volume, onVolumeChange }: Props) {
  return (
    <div className="group/music flex h-11 flex-row items-center">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center">
        <MusicToggle enabled={enabled} onToggle={onToggle} variant="panel" />
      </div>
      <div
        className="flex min-h-9 max-h-9 min-w-0 max-w-0 flex-row items-center gap-1 overflow-hidden rounded-full border border-white/18 bg-black/50 py-1.5 pl-2 pr-2 shadow-[0_6px_22px_rgba(0,0,0,0.42)] backdrop-blur-md transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] opacity-0 pointer-events-none group-hover/music:max-w-[min(58vw,12.5rem)] group-hover/music:opacity-100 group-hover/music:pointer-events-auto group-focus-within/music:max-w-[min(58vw,12.5rem)] group-focus-within/music:opacity-100 group-focus-within/music:pointer-events-auto"
      >
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
          onPointerDown={() => playButtonSelectionSound()}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="h-2 min-w-0 w-[min(40vw,9.25rem)] shrink cursor-pointer accent-sky-400"
          aria-label="Music volume"
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
