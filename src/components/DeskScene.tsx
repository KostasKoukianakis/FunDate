import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { animate, motion, useMotionTemplate, useMotionValue, useTransform } from "framer-motion";
import { setSfxVolume } from "../audio/sfx";
import { usePointerParallax } from "../hooks/usePointerParallax";
import { DustParticles } from "./DustParticles";
import { GodRays } from "./GodRays";
import { EnvelopeFlashTransition } from "./EnvelopeFlashTransition";
import { EnvelopeHotspot } from "./EnvelopeHotspot";
import { MusicControls } from "./MusicControls";
import { DeskOptionCanvasReveal } from "./DeskOptionCanvasReveal";
import { PostEnvelopeScene } from "./PostEnvelopeScene";
import { SfxControls } from "./SfxControls";
import type { HarborChoiceKey } from "./HarborChoiceOverlay";

const BG_SRC = "/desk.png";
/** Layered above `desk.png` after WP farewell «Back to desk», per harbor path. */
const DESK_OPTION_OVERLAY_SRC: Record<HarborChoiceKey, string> = {
  shore: "/desk_option1.webp",
  feast: "/desk_option2.webp",
  drift: "/desk_option3.webp",
};
/** Organic canvas reveal duration (ms). */
const DESK_OPTION_REVEAL_MS = 5200;
/** Per-overlay visual scale (`transform: scale`) so art does not dominate the desk. */
const DESK_OPTION_OVERLAY_SCALE: Record<HarborChoiceKey, number> = {
  shore: 0.75,
  feast: 0.8,
  drift: 1,
};
/** Αρχική στάθμιση desk loop· κλιμάκωση air ως προς αυτή την τιμή. */
const DEFAULT_MUSIC_VOLUME = 0.22;
const DEFAULT_SFX_VOLUME = 0.68;
/** Ambient loop: burst → harbor → scene_2 → scene_3 (`public/air.mp3`) */
const AIR_AMBIENT_SRC = "/air.mp3";
const AIR_AMBIENT_VOLUME = 0.32;

const DESK_REVEAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Zoom-out + fade + radial de-blur on the desk photo (sharp over blurred; mask expands from center). */
const SCENE_REVEAL_DURATION = 5.85;
const SCENE_ZOOM_START = 1.1;
/** Luminance mask: white = sharp layer visible; animate % from small (center only) to full frame. */
const REVEAL_MASK_INNER_START = 6;
const REVEAL_MASK_INNER_END = 96;

const narrativeRevealTransition = (reducedMotion: boolean) =>
  reducedMotion
    ? { duration: 0 }
    : {
        /** Εμφάνιση νωρίς στη σκηνή· το ίδιο το fade κρατάει περισσότερο (δραματικό). */
        delay: 0.38,
        duration: 2.65,
        ease: DESK_REVEAL_EASE,
      };

type Props = {
  reducedMotion: boolean;
  deskLoopRef: RefObject<HTMLAudioElement | null>;
};

export function DeskScene({ reducedMotion, deskLoopRef }: Props) {
  const airAmbientRef = useRef<HTMLAudioElement>(null);
  const audioApplyGenRef = useRef(0);

  /** Μετά τον φάκελο: burst+flash → harbor. Μένει true μετά το post ώστε το burn intro να μην κόβεται. */
  const [harborViaEnvelope, setHarborViaEnvelope] = useState(false);
  const [deskAct, setDeskAct] = useState<"desk" | "burst" | "post">("desk");
  /** After WP farewell — which option art sits above `desk.png` (null = base desk only). */
  const [deskOptionOverlay, setDeskOptionOverlay] = useState<HarborChoiceKey | null>(null);
  /** True only when returning via farewell «Back to desk» — enables organic canvas reveal. */
  const [deskOverlayOrganicReveal, setDeskOverlayOrganicReveal] = useState(false);
  /** Bumps on each farewell «Back to desk» so the overlay remounts and the organic reveal can replay. */
  const [deskOverlayRevealKey, setDeskOverlayRevealKey] = useState(0);
  /** Επιλογή harbor (για μελλοντική πλοήγηση). */
  const [_harborChoice, setHarborChoice] = useState<HarborChoiceKey | null>(null);
  /** Αυξάνεται στο replay ώστε το PostEnvelope να remount-άρει καθαρά (ίδια ροή με νέο burst). */
  const [harborFlowKey, setHarborFlowKey] = useState(0);
  const [musicOn, setMusicOn] = useState(true);
  const [musicVolume, setMusicVolume] = useState(DEFAULT_MUSIC_VOLUME);
  const [sfxVolume, setSfxVolumeState] = useState(DEFAULT_SFX_VOLUME);
  const [mp3Ok, setMp3Ok] = useState(true);
  const [deskMusicAutoplayBlocked, setDeskMusicAutoplayBlocked] = useState(false);

  const musicOnRef = useRef(musicOn);
  musicOnRef.current = musicOn;
  const mp3OkRef = useRef(mp3Ok);
  mp3OkRef.current = mp3Ok;

  const {
    rotateX,
    rotateY,
    shiftX,
    shiftY,
    pointerNudgeX,
    pointerNudgeY,
    onPointerMove,
    reset,
  } = usePointerParallax({
    maxDeg: reducedMotion ? 0 : 4.85,
    maxShiftPx: reducedMotion ? 0 : 17,
    disabled: reducedMotion,
  });

  const raysParallaxX = useTransform(shiftX, (v) => (reducedMotion ? 0 : v * 0.72));
  const raysParallaxY = useTransform(shiftY, (v) => (reducedMotion ? 0 : v * 0.72));
  const dustParallaxX = useTransform(shiftX, (v) => (reducedMotion ? 0 : v * 1.02));
  const dustParallaxY = useTransform(shiftY, (v) => (reducedMotion ? 0 : v * 1.02));

  const deskRevealInner = useMotionValue(reducedMotion ? REVEAL_MASK_INNER_END : REVEAL_MASK_INNER_START);
  const deskSharpMask = useMotionTemplate`radial-gradient(ellipse 128% 122% at 50% 46%, white 0%, white ${deskRevealInner}%, transparent calc(${deskRevealInner}% + 2.5%))`;

  useEffect(() => {
    if (reducedMotion) return;
    deskRevealInner.set(REVEAL_MASK_INNER_START);
    const c = animate(deskRevealInner, REVEAL_MASK_INNER_END, {
      duration: SCENE_REVEAL_DURATION,
      ease: DESK_REVEAL_EASE,
    });
    return () => c.stop();
  }, [reducedMotion, deskRevealInner]);

  useEffect(() => {
    const a = deskLoopRef.current;
    if (!a) return;
    const onErr = () => setMp3Ok(false);
    a.addEventListener("error", onErr);
    return () => a.removeEventListener("error", onErr);
  }, [deskLoopRef]);

  useEffect(() => {
    setSfxVolume(sfxVolume);
  }, [sfxVolume]);

  const applyMusic = useCallback(async () => {
    const gen = ++audioApplyGenRef.current;
    const stale = () => gen !== audioApplyGenRef.current;

    const a = deskLoopRef.current;

    if (!musicOn) {
      if (stale()) return;
      setDeskMusicAutoplayBlocked(false);
      if (a) {
        a.pause();
        a.muted = true;
        a.volume = 0;
      }
      return;
    }

    if (a) {
      a.muted = false;
      a.volume = musicVolume;
    }

    if (!mp3Ok || !a) return;

    try {
      if (stale()) return;
      await a.play();
      if (stale()) {
        /* Νεότερη κλήση applyMusic (π.χ. Strict Mode / burst) — μην κόβουμε το play που ήδη τρέχει. */
        return;
      }
      setDeskMusicAutoplayBlocked(false);
    } catch (e) {
      if (stale()) return;
      if (e instanceof DOMException && e.name === "NotAllowedError") {
        setDeskMusicAutoplayBlocked(true);
        return;
      }
      setMp3Ok(false);
      setDeskMusicAutoplayBlocked(false);
    }
  }, [musicOn, mp3Ok, deskLoopRef, musicVolume]);

  const toggleMusic = useCallback(() => {
    setMusicOn((prev) => {
      const next = !prev;
      if (next) {
        const a = deskLoopRef.current;
        if (a && mp3Ok) {
          a.muted = false;
          a.volume = musicVolume;
          try {
            void a.play();
          } catch {
            /* ignore */
          }
        }
        setDeskMusicAutoplayBlocked(false);
      } else {
        setDeskMusicAutoplayBlocked(false);
      }
      return next;
    });
  }, [mp3Ok, deskLoopRef, musicVolume]);

  useEffect(() => {
    if (!deskMusicAutoplayBlocked || !musicOn) return;

    const detach = () => {
      window.removeEventListener("pointerdown", unlockDeskMusic, true);
      window.removeEventListener("keydown", unlockDeskMusic, true);
    };

    const unlockDeskMusic = () => {
      detach();
      setDeskMusicAutoplayBlocked(false);
      const a = deskLoopRef.current;
      if (!a || !musicOnRef.current || !mp3OkRef.current) return;
      a.muted = false;
      a.volume = musicVolume;
      try {
        void a.play();
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("pointerdown", unlockDeskMusic, { capture: true });
    window.addEventListener("keydown", unlockDeskMusic, { capture: true });
    return detach;
  }, [deskMusicAutoplayBlocked, musicOn, musicVolume]);

  const handleBackToDesk = useCallback((opts?: { farewellChoice?: HarborChoiceKey }) => {
    setHarborChoice(null);
    setHarborFlowKey((k) => k + 1);
    setHarborViaEnvelope(false);
    setDeskAct("desk");
    if (opts?.farewellChoice) {
      setDeskOverlayOrganicReveal(true);
      setDeskOverlayRevealKey((k) => k + 1);
      setDeskOptionOverlay(opts.farewellChoice);
    } else {
      setDeskOverlayOrganicReveal(false);
    }
  }, []);

  const handleHarborFlowReplay = useCallback(() => {
    setHarborChoice(null);
    setHarborFlowKey((k) => k + 1);
    setHarborViaEnvelope(true);
    setDeskAct("burst");
    setDeskOverlayOrganicReveal(false);
    setDeskOptionOverlay(null);
  }, []);

  useEffect(() => {
    void applyMusic();
  }, [applyMusic]);

  useEffect(() => {
    const air = airAmbientRef.current;
    if (!air) return;
    if ((deskAct !== "burst" && deskAct !== "post") || !musicOn) {
      air.pause();
      air.muted = true;
      air.volume = 0;
      return;
    }
    air.muted = false;
    air.volume = Math.min(1, AIR_AMBIENT_VOLUME * (musicVolume / DEFAULT_MUSIC_VOLUME));
    void air.play().catch(() => {
      /* NotAllowedError ή λείπει το αρχείο */
    });
  }, [deskAct, musicOn, musicVolume]);

  useEffect(() => {
    const a = deskLoopRef.current;
    if (!a || !musicOn || !mp3Ok) return;
    a.volume = musicVolume;
  }, [musicVolume, musicOn, mp3Ok, deskLoopRef]);

  const deskOverlaySrc = deskOptionOverlay ? DESK_OPTION_OVERLAY_SRC[deskOptionOverlay] : null;
  const deskOverlayScale =
    deskOptionOverlay != null ? DESK_OPTION_OVERLAY_SCALE[deskOptionOverlay] : 1;

  const deskOverlayLayer =
    deskOverlaySrc == null ? null : deskOverlayScale < 0.999 ? (
      <div
        key={`desk-overlay-wrap-${deskOptionOverlay}-${deskOverlayRevealKey}`}
        className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            transform: `scale(${deskOverlayScale})`,
            transformOrigin: "50% 50%",
          }}
        >
          <DeskOptionCanvasReveal
            key={`desk-overlay-${deskOptionOverlay}-${deskOverlayRevealKey}`}
            src={deskOverlaySrc}
            reducedMotion={reducedMotion}
            revealMs={DESK_OPTION_REVEAL_MS}
            organicReveal={deskOverlayOrganicReveal}
          />
        </div>
      </div>
    ) : (
      <DeskOptionCanvasReveal
        key={`desk-overlay-${deskOptionOverlay}-${deskOverlayRevealKey}`}
        src={deskOverlaySrc}
        reducedMotion={reducedMotion}
        revealMs={DESK_OPTION_REVEAL_MS}
        organicReveal={deskOverlayOrganicReveal}
      />
    );

  const deskPhoto = reducedMotion ? (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <img
          src={BG_SRC}
          alt=""
          className="pointer-events-none h-full w-full object-cover select-none"
          draggable={false}
        />
        {deskOverlayLayer}
      </div>
    </div>
  ) : (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <img
        src={BG_SRC}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full scale-[1.04] object-cover select-none [filter:blur(11px)]"
      />
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          WebkitMaskImage: deskSharpMask,
          maskImage: deskSharpMask,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
        }}
      >
        <div className="pointer-events-none relative h-full w-full">
          <img
            src={BG_SRC}
            alt=""
            className="pointer-events-none h-full w-full object-cover select-none"
            draggable={false}
          />
          {deskOverlayLayer}
        </div>
      </motion.div>
    </div>
  );

  const sceneStack = (
    <div
      className="pointer-events-none absolute inset-[-14%]"
      style={{ transformStyle: reducedMotion ? undefined : "preserve-3d" }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          translateZ: reducedMotion ? 0 : -34,
          transformStyle: reducedMotion ? undefined : "preserve-3d",
        }}
      >
        {deskPhoto}
      </motion.div>

      <motion.div
        className="pointer-events-none absolute inset-0 z-[4]"
        style={{
          translateZ: reducedMotion ? 0 : 38,
          x: raysParallaxX,
          y: raysParallaxY,
          transformStyle: reducedMotion ? undefined : "preserve-3d",
        }}
      >
        <GodRays reducedMotion={reducedMotion} />
      </motion.div>

      <motion.div
        className="pointer-events-none absolute inset-0 z-[6]"
        style={{
          translateZ: reducedMotion ? 0 : 78,
          x: dustParallaxX,
          y: dustParallaxY,
          transformStyle: reducedMotion ? undefined : "preserve-3d",
        }}
      >
        <DustParticles
          reducedMotion={reducedMotion}
          pointerNudgeX={pointerNudgeX}
          pointerNudgeY={pointerNudgeY}
        />
      </motion.div>

      <motion.div
        className="pointer-events-none absolute inset-0 z-[20]"
        style={{
          translateZ: reducedMotion ? 0 : -34,
          transformStyle: reducedMotion ? undefined : "preserve-3d",
        }}
      >
        <EnvelopeHotspot
          reducedMotion={reducedMotion}
          onOpen={() => {
            setHarborViaEnvelope(true);
            setDeskAct("burst");
            setDeskOverlayOrganicReveal(false);
            setDeskOptionOverlay(null);
          }}
        />
      </motion.div>
    </div>
  );

  return (
    <div
      className={`relative h-dvh w-full overflow-hidden ${deskAct === "post" ? "bg-black" : "bg-white"} text-[#f8fafc]`}
      onPointerMove={(e) => onPointerMove({ clientX: e.clientX, clientY: e.clientY })}
      onPointerLeave={() => reset()}
    >
      <audio ref={airAmbientRef} src={AIR_AMBIENT_SRC} loop preload="auto" className="hidden" />

      <div className="pointer-events-auto fixed left-4 top-4 z-[120] flex flex-col items-start gap-2 sm:left-6 sm:top-6">
        <MusicControls
          enabled={musicOn}
          onToggle={toggleMusic}
          volume={musicVolume}
          onVolumeChange={setMusicVolume}
        />
        <SfxControls volume={sfxVolume} onVolumeChange={setSfxVolumeState} />
      </div>

      {deskAct !== "post" ? (
        <>
          <motion.div
            className="pointer-events-none relative h-full w-full min-h-0"
            style={{
              perspective: reducedMotion ? undefined : "1180px",
              perspectiveOrigin: "50% 46%",
              overflow: reducedMotion ? "hidden" : "visible",
            }}
          >
            <motion.div
              className="pointer-events-none relative h-full w-full will-change-transform"
              style={{
                transformStyle: "preserve-3d",
                transformOrigin: "50% 50%",
                x: shiftX,
                y: shiftY,
                rotateX,
                rotateY,
              }}
            >
              <motion.div
                className="pointer-events-none absolute inset-0"
                style={{ transformOrigin: "50% 46%" }}
                initial={reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: SCENE_ZOOM_START }}
                animate={{ opacity: 1, scale: 1 }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { duration: SCENE_REVEAL_DURATION, ease: DESK_REVEAL_EASE }
                }
              >
                {sceneStack}
              </motion.div>
            </motion.div>
          </motion.div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[45] flex justify-center px-5 pb-[calc(env(safe-area-inset-bottom,0px)+clamp(5.25rem,18dvh,11rem))] pt-24 sm:pb-[calc(env(safe-area-inset-bottom,0px)+clamp(6rem,20dvh,12rem))] sm:pt-28">
            <motion.div
              className="desk-cinematic-narrative relative w-full max-w-[min(72rem,96vw)] text-center"
              initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={narrativeRevealTransition(reducedMotion)}
            >
              <div className="desk-cinematic-narrative__sheet" aria-hidden />
              <p className="desk-cinematic-narrative__copy">
                A small note, left here for you—no quiz, no clock.
                <br />
                Open the envelope whenever you&apos;re in the mood to see what&apos;s inside.
              </p>
            </motion.div>
          </div>
        </>
      ) : null}

      {(deskAct === "burst" || deskAct === "post") && (
        <PostEnvelopeScene
          key={`harbor-flow-${harborFlowKey}`}
          reducedMotion={reducedMotion}
          introFromFlash={harborViaEnvelope}
          onHarborChoice={setHarborChoice}
          onReplay={handleHarborFlowReplay}
          onBackToDesk={handleBackToDesk}
        />
      )}

      {deskAct === "burst" ? (
        <EnvelopeFlashTransition
          reducedMotion={reducedMotion}
          onFinished={() => setDeskAct("post")}
        />
      ) : null}
    </div>
  );
}
