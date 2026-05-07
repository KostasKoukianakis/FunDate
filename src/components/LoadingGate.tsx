import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  playHiElectraIntroInUserGesture,
  playHiElectraIntroSound,
  playButtonSelectionSound,
} from "../audio/sfx";
import { useUiButtonSounds } from "../hooks/useUiButtonSounds";
import {
  HiElectraTitleMark,
  HI_ELECTRA_SEQUENCE_MS,
  HI_ELECTRA_SEQUENCE_MS_HERO_VIDEO,
} from "./HiElectraTitleMark";

const DESK_SRC = "/desk.png";
const HERO_POSTER_SRC = "/hero.webp";
const HERO_VIDEO_SRC = "/hero_video.mp4";

type Props = {
  reducedMotion: boolean;
  onReady: () => void;
  /** Σύγχρονο `play()` για το desk loop στο ίδιο gesture με intro (autoplay policy). */
  onUserAudioPrime?: () => void;
};

function waitImageDecode(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = () => {
      const p = img.decode?.();
      if (p !== undefined) {
        void p.then(done).catch(done);
      } else {
        done();
      }
    };
    img.onerror = done;
    img.src = src;
  });
}

function waitVideoCanPlay(video: HTMLVideoElement | null): Promise<void> {
  return new Promise((resolve) => {
    if (!video) {
      resolve();
      return;
    }
    const finish = () => {
      video.removeEventListener("canplaythrough", finish);
      video.removeEventListener("loadeddata", finish);
      video.removeEventListener("error", onErr);
      resolve();
    };
    const onErr = () => {
      video.removeEventListener("canplaythrough", finish);
      video.removeEventListener("loadeddata", finish);
      video.removeEventListener("error", onErr);
      resolve();
    };
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      resolve();
      return;
    }
    video.addEventListener("canplaythrough", finish, { once: true });
    video.addEventListener("loadeddata", finish, { once: true });
    video.addEventListener("error", onErr, { once: true });
  });
}

export function LoadingGate({ reducedMotion, onReady, onUserAudioPrime }: Props) {
  const [tapDone, setTapDone] = useState(reducedMotion);
  const tapConsumed = useRef(false);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const tapUi = useUiButtonSounds();

  useEffect(() => {
    tapConsumed.current = false;
  }, []);

  /** Reduced motion: ίδια ροή με ήχο intro + στατικός τίτλος. */
  useEffect(() => {
    if (!reducedMotion) return;
    let cancelled = false;
    void playHiElectraIntroSound().then((ok) => {
      if (!cancelled && ok) onUserAudioPrime?.();
    });
    return () => {
      cancelled = true;
    };
  }, [reducedMotion, onUserAudioPrime]);

  /** Hero video: ξεκινά αμέσως μόλις υπάρχει ref (muted autoplay). */
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const id = requestAnimationFrame(() => {
      void heroVideoRef.current?.play().catch(() => {
        /* autoplay policy */
      });
    });
    return () => cancelAnimationFrame(id);
  }, [reducedMotion]);

  /** Reduced motion: έξοδος μετά desk + poster + πλήρης τίτλος. */
  useLayoutEffect(() => {
    if (!reducedMotion) return;
    let cancelled = false;
    void (async () => {
      await Promise.all([waitImageDecode(DESK_SRC), waitImageDecode(HERO_POSTER_SRC)]);
      await new Promise<void>((r) => {
        window.setTimeout(r, HI_ELECTRA_SEQUENCE_MS);
      });
      if (!cancelled) onReady();
    })();
    return () => {
      cancelled = true;
    };
  }, [reducedMotion, onReady]);

  /** Video path: έξοδος αφού το tap και το hello. animation ολοκληρωθούν. */
  useLayoutEffect(() => {
    if (reducedMotion || !tapDone) return;
    let cancelled = false;
    void (async () => {
      await waitImageDecode(DESK_SRC);
      await waitVideoCanPlay(heroVideoRef.current);
      await new Promise<void>((r) => {
        window.setTimeout(r, HI_ELECTRA_SEQUENCE_MS_HERO_VIDEO);
      });
      if (!cancelled) onReady();
    })();
    return () => {
      cancelled = true;
    };
  }, [reducedMotion, tapDone, onReady]);

  const showTapOverlay = !reducedMotion && !tapDone;

  const onTapToStart = () => {
    if (tapConsumed.current) return;
    tapConsumed.current = true;
    playHiElectraIntroInUserGesture();
    onUserAudioPrime?.();
    setTapDone(true);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden px-6"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1.05, ease: [0.22, 1, 0.36, 1] } }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[#070b14]" aria-hidden />

      {reducedMotion ? (
        <img
          src={HERO_POSTER_SRC}
          alt=""
          decoding="async"
          fetchPriority="high"
          draggable={false}
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-[center_30%]"
        />
      ) : (
        <video
          ref={heroVideoRef}
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-[center_30%]"
          src={HERO_VIDEO_SRC}
          poster={HERO_POSTER_SRC}
          muted
          playsInline
          autoPlay
          preload="auto"
          loop={false}
          aria-hidden
        />
      )}

      <div
        className="pointer-events-none absolute inset-0 z-[3] shadow-[inset_0_0_min(28vw,220px)_rgba(2,6,18,0.55)]"
        aria-hidden
      />

      {/* Vignette: διαφορετικές γωνίες + «ανεστραμμένη» καμπύλη στη βάση (πλάια πιο σκούρα, κέντρο πιο ανοιχτό) — κρύβει watermark κάτω */}
      <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 92% 78% at 0% 0%, rgba(2, 6, 18, 0.54) 0%, rgba(7, 11, 20, 0.22) 42%, transparent 62%),
              radial-gradient(ellipse 72% 96% at 100% 0%, rgba(2, 6, 18, 0.4) 0%, rgba(7, 11, 20, 0.18) 48%, transparent 66%),
              radial-gradient(ellipse 105% 82% at 0% 100%, rgba(2, 6, 18, 0.68) 0%, rgba(7, 11, 20, 0.35) 38%, transparent 54%),
              radial-gradient(ellipse 80% 92% at 100% 100%, rgba(2, 6, 18, 0.46) 0%, rgba(7, 11, 20, 0.2) 52%, transparent 64%)
            `,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 125% 72% at 50% 118%, rgba(2, 6, 18, 0.36) 0%, rgba(7, 11, 20, 0.14) 38%, transparent 58%)",
          }}
        />
      </div>

      <div className="relative z-[80] flex w-full max-w-[min(96vw,52rem)] flex-col items-center justify-center">
        {reducedMotion ? (
          <HiElectraTitleMark reducedMotion key="rm" />
        ) : tapDone ? (
          <HiElectraTitleMark reducedMotion={false} frozen={false} hideElectraRow key="live" />
        ) : null}
      </div>

      {showTapOverlay ? (
        <button
          type="button"
          className="absolute inset-0 z-[11] flex cursor-pointer flex-col items-center justify-end border-0 bg-transparent pb-10 pt-0 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/65 focus-visible:ring-offset-4 focus-visible:ring-offset-[#070b14]"
          aria-label="Tap anywhere to start"
          autoFocus
          onPointerEnter={tapUi.onPointerEnter}
          onFocus={tapUi.onFocus}
          onPointerDown={(e) => {
            e.preventDefault();
            playButtonSelectionSound();
            onTapToStart();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              playButtonSelectionSound();
              onTapToStart();
            }
          }}
        >
          <div className="desk-cinematic-narrative pointer-events-none relative mx-auto w-full max-w-[min(72rem,96vw)] px-5 text-center">
            <div className="desk-cinematic-narrative__sheet" aria-hidden />
            <p className="desk-cinematic-narrative__copy">Tap anywhere to start</p>
          </div>
        </button>
      ) : null}
    </motion.div>
  );
}
