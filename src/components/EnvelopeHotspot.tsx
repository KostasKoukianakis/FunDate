import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { playEnvelopeHoverSound, playEnvelopeSparkleSound } from "../audio/sfx";

type Props = {
  reducedMotion: boolean;
  onOpen: () => void;
};

/** Προτιμήστε `public/envelope.webp` (διαφανές φόντο)· αν λείπει, φορτώνει το default SVG */
const ENVELOPE_PRIMARY = "/envelope.webp";
const ENVELOPE_FALLBACK = "/envelope.svg";
/** Hover art — αποκάλυψη από το κέντρο προς τα έξω (`clip-path: circle`) */
const ENVELOPE_HOVER = "/envelope_hover.webp";
/** Διακοσμητικό cue πάνω από τον φάκελο — `public/indicator.png` */
const INDICATOR_SRC = "/indicator.png";

/** Επαφή με το γραφείο: λεπτή σκιά κάτω–αριστερά· σε hover μεγαλύτερη/μαλακή σαν να σηκώθηκε */
const ENVELOPE_FILTER_REST =
  "drop-shadow(-1px 2px 0 rgba(48, 32, 22, 0.62)) drop-shadow(-2px 3px 0.35px rgba(38, 26, 18, 0.32))";
const ENVELOPE_FILTER_LIFTED =
  "drop-shadow(-7px 22px 18px rgba(12, 8, 6, 0.38)) drop-shadow(-4px 12px 10px rgba(36, 24, 16, 0.26))";

/** Φάκελος κεντραρισμένος στο (--hx,--hy)· το indicator είναι absolute πάνω του. */
export function EnvelopeHotspot({ reducedMotion, onOpen }: Props) {
  const hoverGate = useRef(false);
  const [imgSrc, setImgSrc] = useState(ENVELOPE_FALLBACK);
  const [hoverImgOk, setHoverImgOk] = useState(false);
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const probe = new Image();
    probe.onload = () => setImgSrc(ENVELOPE_PRIMARY);
    probe.onerror = () => {};
    probe.src = ENVELOPE_PRIMARY;
  }, []);

  useEffect(() => {
    const probe = new Image();
    probe.onload = () => setHoverImgOk(true);
    probe.onerror = () => setHoverImgOk(false);
    probe.src = ENVELOPE_HOVER;
  }, []);

  const handleHover = () => {
    if (hoverGate.current) return;
    hoverGate.current = true;
    playEnvelopeHoverSound();
    window.setTimeout(() => {
      hoverGate.current = false;
    }, 500);
  };

  const handleOpen = () => {
    playEnvelopeSparkleSound();
    onOpen();
  };

  const vars = {
    "--hx": "50%",
    "--hy": "52%",
  } as CSSProperties;

  return (
    <div className="pointer-events-none absolute inset-0 z-[25]" style={vars}>
      {/* auto μόνο στο bounding box του φακέλου — τα υπόλοιπα περνάνε για rays/dust */}
      <div className="absolute left-[var(--hx)] top-[var(--hy)] pointer-events-auto">
        <motion.button
          type="button"
          aria-label="Άνοιγμα πρόσκλησης — envelope"
          onPointerEnter={() => {
            setLifted(true);
            handleHover();
          }}
          onPointerLeave={() => setLifted(false)}
          onFocus={() => {
            setLifted(true);
            handleHover();
          }}
          onBlur={() => setLifted(false)}
          onClick={handleOpen}
          whileHover={
            reducedMotion
              ? undefined
              : { y: -7, transition: { duration: 0.59, ease: [0.22, 1, 0.36, 1] } }
          }
          whileTap={reducedMotion ? undefined : { scale: 0.985 }}
          className="relative block -translate-x-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/65 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent pointer-events-auto"
        >
          <motion.img
            src={INDICATOR_SRC}
            alt=""
            width={112}
            height={68}
            draggable={false}
            aria-hidden
            className="pointer-events-none absolute bottom-full left-1/2 mb-2 h-auto w-[min(12vw,112px)] max-w-[36vw] -translate-x-1/2 select-none object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.32)] sm:mb-3"
            animate={
              reducedMotion
                ? undefined
                : {
                    y: [4, -11, 4],
                    transition: {
                      duration: 4.65,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }
            }
          />
          <motion.div
            className="relative h-auto w-[min(42vw,520px)] max-w-[92vw]"
            animate={{
              filter: reducedMotion
                ? ENVELOPE_FILTER_REST
                : lifted
                  ? ENVELOPE_FILTER_LIFTED
                  : ENVELOPE_FILTER_REST,
            }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 0.58, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <motion.img
              src={imgSrc}
              alt=""
              width={520}
              height={364}
              draggable={false}
              className="pointer-events-none relative z-0 block h-auto w-full select-none object-contain"
              initial={false}
              animate={{
                opacity: hoverImgOk && lifted ? 0 : 1,
              }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 0.52, ease: [0.22, 1, 0.36, 1] }
              }
            />
            {hoverImgOk ? (
              <motion.img
                src={ENVELOPE_HOVER}
                alt=""
                width={520}
                height={364}
                draggable={false}
                className="pointer-events-none absolute inset-0 z-[1] h-full w-full select-none object-contain"
                initial={false}
                animate={{
                  clipPath: lifted
                    ? "circle(150% at 50% 50%)"
                    : "circle(0% at 50% 50%)",
                }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { duration: 0.52, ease: [0.22, 1, 0.36, 1] }
                }
              />
            ) : null}
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
}
