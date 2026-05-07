import { AnimatePresence, motion } from "framer-motion";
import { useUiButtonSounds } from "../hooks/useUiButtonSounds";

export type HarborChoiceKey = "shore" | "feast" | "drift";

export type HarborChoice = {
  key: HarborChoiceKey;
  title: string;
  line: string;
};

export const HARBOR_CHOICES: HarborChoice[] = [
  {
    key: "shore",
    title: "Let's meet outside",
    line: "Coffee, a walk, somewhere low-key—after that we can trade messages and find a day and corner that both feel right.",
  },
  {
    key: "feast",
    title: "Another night in",
    line: "You've already got your evening—fair enough. We can look for sunlight another day.",
  },
  {
    key: "drift",
    title: "Ask me again later",
    line: "No pressure. Leave it open; when the timing feels right, we can pick this up.",
  },
];

type Props = {
  reducedMotion: boolean;
  visible: boolean;
  selected: HarborChoiceKey | null;
  onSelect: (key: HarborChoiceKey) => void;
};

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.11, delayChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const promptVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

type RowProps = {
  c: HarborChoice;
  reducedMotion: boolean;
  selected: HarborChoiceKey | null;
  onSelect: (key: HarborChoiceKey) => void;
};

function HarborChoiceRow({ c, reducedMotion, selected, onSelect }: RowProps) {
  const ui = useUiButtonSounds();
  const isSel = selected === c.key;
  return (
    <motion.li {...(!reducedMotion ? { variants: itemVariants } : {})}>
      <button
        type="button"
        onPointerEnter={ui.onPointerEnter}
        onFocus={ui.onFocus}
        onClick={ui.wrapClick(() => onSelect(c.key))}
        aria-pressed={isSel}
        className={`harbor-choice-btn group w-full text-left ${isSel ? "harbor-choice-btn--selected" : ""}`}
      >
        <span className="harbor-choice-btn__outer">
          <span className="harbor-choice-btn__corners" aria-hidden />
          <span className="harbor-choice-btn__inner">
            <span className="harbor-choice-btn__gem" aria-hidden />
            <span className="harbor-choice-btn__text">
              <span className="harbor-choice-btn__title">{c.title}</span>
              <span className="harbor-choice-btn__line">{c.line}</span>
            </span>
          </span>
        </span>
      </button>
    </motion.li>
  );
}

/** Τρεις επιλογές (χρυσό / τεαλ πλαίσιο) + ίδιο serif κείμενο με το desk narrative. */
export function HarborChoiceOverlay({ reducedMotion, visible, selected, onSelect }: Props) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="harbor-choice-overlay pointer-events-none absolute inset-0 z-[130] flex flex-col justify-end"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          transition={{ duration: reducedMotion ? 0.2 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          aria-live="polite"
        >
          <div className="harbor-choice-overlay__vignette pointer-events-none absolute inset-0" aria-hidden />

          <div className="pointer-events-auto relative mx-auto flex w-full max-w-[min(72rem,96vw)] flex-col gap-8 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+clamp(1.75rem,6dvh,3.25rem))] pt-16 sm:gap-10 sm:pb-[calc(env(safe-area-inset-bottom,0px)+clamp(2.25rem,7dvh,3.75rem))]">
            <motion.div
              className="desk-cinematic-narrative harbor-choice-narrative relative mx-auto w-full text-center"
              variants={reducedMotion ? undefined : promptVariants}
              initial={reducedMotion ? { opacity: 1, y: 0 } : "hidden"}
              animate={reducedMotion ? { opacity: 1, y: 0 } : "show"}
            >
              <div className="desk-cinematic-narrative__sheet" aria-hidden />
              <p className="desk-cinematic-narrative__copy harbor-choice-narrative__prompt">
                The harbor slows everything down—choose what fits how you feel tonight.
                <br />
                Nothing here is a trick; every path is gentle, including the one that waits.
              </p>
            </motion.div>

            <motion.ul
              role="list"
              className="relative z-10 mx-auto flex w-full max-w-[min(40rem,100%)] flex-col gap-3.5 sm:gap-4"
              variants={reducedMotion ? undefined : listVariants}
              initial={reducedMotion ? { opacity: 1 } : "hidden"}
              animate={reducedMotion ? { opacity: 1 } : "show"}
            >
              {HARBOR_CHOICES.map((c) => (
                <HarborChoiceRow key={c.key} c={c} reducedMotion={reducedMotion} selected={selected} onSelect={onSelect} />
              ))}
            </motion.ul>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
