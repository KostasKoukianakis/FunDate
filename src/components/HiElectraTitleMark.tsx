import { motion } from "framer-motion";

/** Εμφάνιση «ELECTRA» (πάνω). */
export const HI_ELECTRA_NAME_IN_MS = 820;
/** Παύση μετά το όνομα, πριν το «hello.». */
export const HI_ELECTRA_HELLO_GAP_MS = 380;

const HELLO_MARK = "hello." as const;
const HELLO_LETTERS = [...HELLO_MARK] as readonly string[];
/** Διάστημα μεταξύ γραμμάτων (αριστερά → δεξιά). */
const HELLO_STAGGER_MS = 148;
/** Διάρκεια εμφάνισης ανά γράμμα. */
const HELLO_LETTER_MS = 460;
/** Buffer μετά το τελευταίο γράμμα. */
const HELLO_END_PAD_MS = 140;

/** Συνολική φάση «hello.» (stagger + τελευταίο γράμμα). */
export const HI_ELECTRA_HELLO_IN_MS =
  (HELLO_LETTERS.length - 1) * HELLO_STAGGER_MS + HELLO_LETTER_MS + HELLO_END_PAD_MS;

/** Μικρό buffer πριν το `onReady` ώστε το animation να «καθίσει». */
export const HI_ELECTRA_TAIL_MS = 320;
/** Συνολικός χρόνος μέχρι να «τελειώσει» το mark (για `LoadingGate` / `onReady`). */
export const HI_ELECTRA_SEQUENCE_MS =
  HI_ELECTRA_NAME_IN_MS + HI_ELECTRA_HELLO_GAP_MS + HI_ELECTRA_HELLO_IN_MS + HI_ELECTRA_TAIL_MS;

/** Same face as `.desk-cinematic-narrative__copy` (text under the envelope on the desk). */
const HELLO_TEXT_SHADOW =
  "0 0 1px rgba(255, 252, 248, 0.22), 0 1px 0 rgba(62, 42, 28, 0.28), 1px 2px 11px rgba(48, 30, 18, 0.55), 0 0 28px rgba(56, 38, 24, 0.44), 0 0 54px rgba(42, 26, 16, 0.22)";
/** Παύση πριν το «hello.» όταν το ELECTRA δείχνει ήδη το hero video (χωρίς κείμενο ELECTRA από πάνω). */
export const HI_ELECTRA_HERO_VIDEO_PREFIX_MS = 400;

/** Συνολικός χρόνος mark όταν το ELECTRA είναι μόνο στο video — μόνο hello. + tail. */
export const HI_ELECTRA_SEQUENCE_MS_HERO_VIDEO =
  HI_ELECTRA_HERO_VIDEO_PREFIX_MS + HI_ELECTRA_HELLO_IN_MS + HI_ELECTRA_TAIL_MS;

type Props = {
  reducedMotion: boolean;
  /** Όταν true (χωρίς reduced motion): τελική στάση — περιμένουμε user gesture για ήχο. */
  frozen?: boolean;
  /** Όταν true: κρύβει τη γραμμή ELECTRA (το όνομα υπάρχει στο `hero_video.mp4`). */
  hideElectraRow?: boolean;
};

const easeName = [0.22, 1, 0.36, 1] as const;
const easeHelloLetter = [0.25, 0.9, 0.3, 1] as const;

/**
 * Πάνω: **ELECTRA** (gradient, Fraunces).
 * Κάτω: **hello.** — Playwrite DE SAS, ίδιο λευκό + σκιές με το κείμενο κάτω από τον φάκελο (`desk-cinematic-narrative__copy`).
 */
export function HiElectraTitleMark({
  reducedMotion,
  frozen = false,
  hideElectraRow = false,
}: Props) {
  const skipMotion = reducedMotion || frozen;

  const helloBaseDelayS = hideElectraRow
    ? HI_ELECTRA_HERO_VIDEO_PREFIX_MS / 1000
    : (HI_ELECTRA_NAME_IN_MS + HI_ELECTRA_HELLO_GAP_MS) / 1000;
  const staggerS = HELLO_STAGGER_MS / 1000;
  const letterDurS = HELLO_LETTER_MS / 1000;

  const letterSharedStyle: React.CSSProperties = {
    fontFamily: '"Playwrite DE SAS", cursive',
    fontSize: "clamp(2.35rem, 10vw, 4.25rem)",
    fontWeight: 400,
    letterSpacing: "0.01em",
    color: "#fff",
    textShadow: HELLO_TEXT_SHADOW,
    WebkitFontSmoothing: "antialiased",
  };

  return (
    <div
      className="flex flex-col items-center justify-center gap-[clamp(0.5rem,2vw,0.95rem)] text-center"
      role="img"
      aria-label={hideElectraRow ? "hello." : "hello. ELECTRA"}
    >
      {!hideElectraRow ? (
        <motion.div
          initial={skipMotion ? false : { opacity: 0, y: 22, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={
            skipMotion
              ? { duration: 0 }
              : { duration: HI_ELECTRA_NAME_IN_MS / 1000, ease: easeName }
          }
          className="px-2"
        >
          <span
            className="block bg-gradient-to-r from-[#fef9c3] via-[#38bdf8] to-[#fcd34d] bg-clip-text font-semibold tracking-[0.14em] text-transparent"
            style={{
              fontFamily: '"Fraunces", Georgia, "Times New Roman", serif',
              fontSize: "clamp(2.35rem, 9.2vw, 4.15rem)",
            }}
          >
            ELECTRA
          </span>
        </motion.div>
      ) : null}

      <span className="relative z-[1] inline-flex flex-row flex-nowrap items-baseline justify-center leading-none">
        {HELLO_LETTERS.map((ch, i) =>
          skipMotion ? (
            <span
              key={`${ch}-${i}`}
              className="inline-block"
              style={letterSharedStyle}
            >
              {ch}
            </span>
          ) : (
            <motion.span
              key={`${ch}-${i}`}
              className="inline-block"
              style={letterSharedStyle}
              initial={{ opacity: 0, filter: "blur(12px)", y: 8 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              transition={{
                delay: helloBaseDelayS + i * staggerS,
                duration: letterDurS,
                ease: easeHelloLetter,
              }}
            >
              {ch}
            </motion.span>
          ),
        )}
      </span>
    </div>
  );
}
