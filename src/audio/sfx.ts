/** 0–1: κλιμάκωση όλων των one-shot / intro SFX (ξεχωριστά από τη μουσική). */
let sfxVolume = 0.68;

export function setSfxVolume(value: number) {
  sfxVolume = Math.max(0, Math.min(1, value));
}

export function getSfxVolume() {
  return sfxVolume;
}

const ENVELOPE_HOVER_SRC = "/envelope.mp3";
const ENVELOPE_SPARKLE_SRC = "/sparkle.mp3";
const BUTTON_HOVER_SRC = "/button_hover.mp3";
const BUTTON_SELECTION_SRC = "/button_selection.mp3";
const HI_ELECTRA_INTRO_SRC = "/intro.mp3";
const WATER_POP_SRC = "/water_pop.mp3";

/** Αποφυγή διπλού play σε React Strict Mode (dev). */
let hiElectraIntroPlayed = false;

function playOneShot(src: string, baseVolume: number): void {
  const effective = baseVolume * sfxVolume;
  if (effective <= 0.001) return;
  const a = new Audio(src);
  a.volume = Math.min(1, effective);
  void a.play().catch(() => {
    /* missing file, autoplay, ή NotAllowedError */
  });
}

/** Hover στον φάκελο — `public/envelope.mp3` */
export function playEnvelopeHoverSound(): void {
  playOneShot(ENVELOPE_HOVER_SRC, 0.82);
}

/** Κλικ στον φάκελο — `public/sparkle.mp3` */
export function playEnvelopeSparkleSound(): void {
  playOneShot(ENVELOPE_SPARKLE_SRC, 0.82);
}

/** GG WP block fades in after scene_3 — `public/water_pop.mp3` */
export function playWaterPopSound(): void {
  playOneShot(WATER_POP_SRC, 0.72);
}

/** UI κουμπιά — `public/button_hover.mp3` */
export function playButtonHoverSound(): void {
  playOneShot(BUTTON_HOVER_SRC, 0.52);
}

/** UI κουμπιά — `public/button_selection.mp3` */
export function playButtonSelectionSound(): void {
  playOneShot(BUTTON_SELECTION_SRC, 0.56);
}

/**
 * Πρώτο φορτίσμα με «HI ELECTRA» — `public/intro.mp3`.
 * Επιστρέφει true μόνο αν το `play()` ολοκληρώθηκε (όχι NotAllowedError / λείπει αρχείο).
 * Το `hiElectraIntroPlayed` ορίζεται μόνο μετά επιτυχία ώστε retry μετά από user gesture.
 */
export function playHiElectraIntroSound(): Promise<boolean> {
  if (hiElectraIntroPlayed) return Promise.resolve(true);
  const introBase = 0.82;
  const effective = introBase * sfxVolume;
  if (effective <= 0.001) return Promise.resolve(false);
  const a = new Audio(HI_ELECTRA_INTRO_SRC);
  a.volume = Math.min(1, effective);
  return a
    .play()
    .then(() => {
      hiElectraIntroPlayed = true;
      return true;
    })
    .catch(() => false);
}

/**
 * Καλέστε μόνο μέσα από σύγχρονο pointerdown / keyboard handler (όχι από Promise.then) —
 * iOS Safari απαιτεί άμεση κλήση `play()` μέσα στο gesture chain.
 */
export function playHiElectraIntroInUserGesture(): void {
  if (hiElectraIntroPlayed) return;
  const introBase = 0.82;
  const effective = introBase * sfxVolume;
  if (effective <= 0.001) return;
  const a = new Audio(HI_ELECTRA_INTRO_SRC);
  a.volume = Math.min(1, effective);
  try {
    void a.play().then(
      () => {
        hiElectraIntroPlayed = true;
      },
      () => {
        /* NotAllowedError κ.λπ. */
      },
    );
  } catch {
    /* ignore */
  }
}
