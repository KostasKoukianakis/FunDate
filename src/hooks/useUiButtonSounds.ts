import { useCallback, useRef } from "react";
import { playButtonHoverSound, playButtonSelectionSound } from "../audio/sfx";

type Options = {
  /** Αποφυγή spam στο hover (ms). */
  hoverCooldownMs?: number;
};

/**
 * Hover + selection one-shots για κουμπιά (`button_hover.mp3` / `button_selection.mp3`).
 * Σέβεται το `sfxVolume` από το module `sfx` (ρυθμίζεται από SfxControls).
 */
export function useUiButtonSounds(options?: Options) {
  const hoverCooldownMs = options?.hoverCooldownMs ?? 280;
  const hoverGate = useRef(false);

  const onPointerEnter = useCallback(() => {
    if (hoverGate.current) return;
    hoverGate.current = true;
    playButtonHoverSound();
    window.setTimeout(() => {
      hoverGate.current = false;
    }, hoverCooldownMs);
  }, [hoverCooldownMs]);

  const onFocus = useCallback(() => {
    onPointerEnter();
  }, [onPointerEnter]);

  const wrapClick = useCallback((fn: () => void) => {
    return () => {
      playButtonSelectionSound();
      fn();
    };
  }, []);

  return { onPointerEnter, onFocus, wrapClick };
}
