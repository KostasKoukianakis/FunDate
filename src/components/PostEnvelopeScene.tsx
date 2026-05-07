import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  BURN_REVEAL_DELAY_S,
  BURN_REVEAL_DURATION_S,
  BURN_REVEAL_EASE,
  HARBOR_VIDEO_FADE_DELAY_S,
  HARBOR_VIDEO_FADE_DURATION_S,
  HARBOR_VIDEO_FADE_EASE,
} from "./EnvelopeFlashTransition";
import { HarborChoiceOverlay, type HarborChoiceKey } from "./HarborChoiceOverlay";
import { SceneReplayButton } from "./SceneReplayButton";
// import { SceneSkipToEndButton } from "./SceneSkipToEndButton";
import { useUiButtonSounds } from "../hooks/useUiButtonSounds";
import { playWaterPopSound } from "../audio/sfx";
import {
  buildWpSubTextShadow,
  buildWpTitleTextShadow,
  WP_GG_DEFAULTS,
  type WpGgDesign,
} from "../wpGgDesign";
import { notifyHarborChoiceConfirmed } from "../lib/notifyHarborChoice";

const HARBOR_VIDEO_SRC = "/harbor_scene.mp4";
/** Still frame until first MP4 frame (match `public/harbor_scene.webp`). */
const HARBOR_VIDEO_POSTER_SRC = "/harbor_scene.webp";
const SCENE_2_SRC = "/scene_2.mp4";
const SCENE_3_SRC = "/scene_3_old.mp4";
/** Pixels: κρύβουμε top watermark — overflow + shift (όχι clip-path, για να μη φαίνεται μαύρο). */
const SCENE2_TOP_CROP_PX = 300;
const CROSSFADE_SEC = 0.9;
/** Fade out του κεντρικού κειμένου scene_2 — ξεκινά τόσα δευτ. πριν το τέλος (πριν το crossfade σε scene_3). */
const SCENE2_NARRATIVE_FADE_LEAD_S = 2.2;
/** Ξεκινάμε crossfade προς scene_3 λίγο πριν το τέλος του scene_2. */
const SCENE2_TO_SCENE3_LEAD_S = 0.52;
/** Μετά την επιλογή harbor — πότε εμφανίζεται το κεντρικό κείμενο στο scene_2. */
const SCENE2_NARRATIVE_REVEAL_DELAY_MS = 1500;
const SCENE2_NARRATIVE_REVEAL_DELAY_REDUCED_MS = 400;
/** Μετά που φαίνεται το scene_3 — fade-in GG WP. */
const SCENE3_WP_REVEAL_DELAY_MS = 480;
/** After «I'm sure» — farewell full-screen copy (slow rise + de-blur). */
const WP_FAREWELL_ENTRANCE_DURATION_S = 1.62;
const WP_FAREWELL_ENTRANCE_DELAY_S = 0.14;

/** Στοίχιση με desk HUD: `MusicControls` + `SfxControls` (δύο σειρές `h-11` + `gap-2`), μετά replay/skip. */
/** HUD replay/skip — πάνω από όλα τα overlays & scene_3 (parent PostEnvelope z-[100]). */
const replayHudAnchorClass =
  "pointer-events-auto fixed left-4 top-[calc(1rem+2.75rem+0.5rem+2.75rem+0.5rem)] z-[150] sm:left-6 sm:top-[calc(1.5rem+2.75rem+0.5rem+2.75rem+0.5rem)]";

const SCENE2_CENTER_LINES: Record<HarborChoiceKey, string[]> = {
  shore: [
    "You said yes to outside—that's the heart of it.",
    "Whenever you're ready to type, we can pick an hour and a meeting spot in easy back-and-forth, then let the walk happen.",
  ],
  feast: [
    "You're keeping tonight for yourself—that's honest, not a rain check on purpose.",
    "When you want walls swapped for salt breeze, we can try this harbor again.",
  ],
  drift: [
    "You asked for distance from the moment itself—that's allowed to be the answer.",
    "The docks stay; come back to the choice whenever your week has room.",
  ],
};

type Scene2Track = "a" | "b" | null;

/** GG WP sublines under the title — shore uses `WP_GG_DEFAULTS`; feast/drift must not read like an outing. */
const WP_GG_SUBS_OVERRIDE: Partial<
  Record<HarborChoiceKey, Pick<WpGgDesign, "wpSubLine1" | "wpSubLine2" | "wpSubLine3">>
> = {
  feast: {
    wpSubLine1: "You're keeping tonight in—that's a full answer, not a warm-up for later.",
    wpSubLine2: "Rest, screens, whatever you already lined up—I'm not grading the evening.",
    wpSubLine3: "When you want daylight plans, say so and we'll aim for the harbor then.",
  },
  drift: {
    wpSubLine1: "Not right now—and that's allowed to be soft, not a door slam.",
    wpSubLine2: "No timer from me; take the space you asked for without a quiz attached.",
    wpSubLine3: "If the week opens up and this still feels right, we can sit with the choice again.",
  },
};

/** Μετά το GG WP: τελική full-screen σκηνή ανά harbor. */
const FAREWELL_BY_CHOICE: Record<
  HarborChoiceKey,
  { wrapClass: string; line1: string; line2: string }
> = {
  shore: {
    wrapClass: "wp-farewell wp-farewell--shore",
    line1: "Good—I'd love some daylight with you.",
    line2: "Message me when you have a breath to spare; we can settle day, place, and the little things in chat before we head out.",
  },
  feast: {
    wrapClass: "wp-farewell wp-farewell--feast",
    line1: "Take care of your night in.",
    line2: "When you want daylight and company again, say so—we'll pick it up from there.",
  },
  drift: {
    wrapClass: "wp-farewell wp-farewell--drift",
    line1: "I'll hold this lightly.",
    line2: "Whenever you're ready to answer for real, I'm still here.",
  },
};

type Props = {
  reducedMotion: boolean;
  introFromFlash?: boolean;
  onHarborChoice?: (key: HarborChoiceKey) => void;
  /** Ίδια ροή με νέο άνοιγμα φακέλου: burst + flash + καθαρό harbor. */
  onReplay?: () => void;
  /** Επιστροφή στο desk όπου φαίνεται ο φάκελος (χωρίς burst transition). */
  /** Which harbor path triggered «Back to desk» — shows `desk_option1/2/3.webp` above `desk.png`. */
  onBackToDesk?: (opts?: { farewellChoice?: HarborChoiceKey }) => void;
};

/**
 * Harbor loop (διπλό βίντεο) → επιλογή → scene_2 → crossfade σε scene_3· το scene_3 ξαναγίνεται ping-pong με CROSSFADE_SEC όπως το harbor (χωρίς native `loop`).
 */
export function PostEnvelopeScene({
  reducedMotion,
  introFromFlash = false,
  onHarborChoice,
  onReplay,
  onBackToDesk,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const filterId = `burn-noise-${uid}`;

  const refA = useRef<HTMLVideoElement>(null);
  const refB = useRef<HTMLVideoElement>(null);
  const opA = useMotionValue(1);
  const opB = useMotionValue(0);
  const containerOpac = useMotionValue(1);
  const burnR = useMotionValue(introFromFlash && !reducedMotion ? 0.15 : 100);
  const leadingRef = useRef<"a" | "b">("a");
  const fadingRef = useRef(false);
  const fadeAnimRef = useRef<ReturnType<typeof animate>[]>([]);

  const [videoFailed, setVideoFailed] = useState(false);
  const [scene2Failed, setScene2Failed] = useState(false);
  const [scene3Failed, setScene3Failed] = useState(false);
  const [scene3Mode, setScene3Mode] = useState(false);
  const [scene3TransitionId, setScene3TransitionId] = useState(0);
  /** Μετά το scene_3 — καθυστέρηση πριν fade-in GG WP. */
  const [scene3OverlayRevealReady, setScene3OverlayRevealReady] = useState(false);
  const [isWpFarewell, setIsWpFarewell] = useState(false);
  const [choicesVisible, setChoicesVisible] = useState(false);
  const [harborPick, setHarborPick] = useState<HarborChoiceKey | null>(null);
  const [videoASrc, setVideoASrc] = useState(HARBOR_VIDEO_SRC);
  const [videoBSrc, setVideoBSrc] = useState(HARBOR_VIDEO_SRC);
  const [scene2Track, setScene2Track] = useState<Scene2Track>(null);
  /** Ξεκινά fade-out του κεντρικού κειμένου στο scene_2 (μένει false στο scene_3). */
  const [scene2NarrativeFadeOut, setScene2NarrativeFadeOut] = useState(false);
  const scene2NarrativeFadeLatchedRef = useRef(false);
  /** Μετά την καθυστέρηση SCENE2_NARRATIVE_REVEAL_* — τότε κάνουμε dramatic fade-in του κειμένου. */
  const [scene2CenterRevealReady, setScene2CenterRevealReady] = useState(false);
  const [textOverlaysHidden, setTextOverlaysHidden] = useState(false);

  /** `harbor_scene.webp` on top of `<video>` until playback — poster/underlay fail when MP4 shows black before decode. */
  const [showHarborStillA, setShowHarborStillA] = useState(false);
  const [showHarborStillB, setShowHarborStillB] = useState(false);
  const prevVideoASrcRef = useRef("");
  const prevVideoBSrcRef = useRef("");

  const uiWpMind = useUiButtonSounds();
  const uiWpSure = useUiButtonSounds();
  const uiFarewellDismiss = useUiButtonSounds();

  const harborPickRef = useRef<HarborChoiceKey | null>(null);
  const scene2TrackRef = useRef<Scene2Track>(null);
  const scene3ModeRef = useRef(false);
  const scene3CrossfadeStartedRef = useRef(false);
  const isWpFarewellRef = useRef(false);
  /** Dedupes `water_pop` per scene_3 run (Strict Mode–safe). */
  const ggWpSoundSessionRef = useRef<string>("");
  harborPickRef.current = harborPick;
  scene2TrackRef.current = scene2Track;
  scene3ModeRef.current = scene3Mode;
  isWpFarewellRef.current = isWpFarewell;

  const wpDesign = useMemo((): WpGgDesign => {
    const sub = harborPick ? WP_GG_SUBS_OVERRIDE[harborPick] : undefined;
    return sub ? { ...WP_GG_DEFAULTS, ...sub } : WP_GG_DEFAULTS;
  }, [harborPick]);

  const burnMask = useMotionTemplate`radial-gradient(circle at 50% 50%, #fff 0%, #fff ${burnR}%, #000 min(100%, calc(${burnR}% + 5.2%)))`;

  const rimBg = useTransform(burnR, (r) => {
    const inner = Math.max(0, r - 2.5);
    const peak = r + 0.4;
    const fall = r + 4.2;
    const end = r + 9;
    return `radial-gradient(circle at 50% 50%, transparent ${inner}%, rgba(255, 140, 72, 0.62) ${peak}%, rgba(85, 28, 6, 0.48) ${fall}%, transparent ${end}%)`;
  });

  const rimOpacity = useTransform(burnR, [0, 72, 88, 96], [1, 1, 0.42, 0]);

  const stopFadeAnims = useCallback(() => {
    fadeAnimRef.current.forEach((a) => a.stop());
    fadeAnimRef.current = [];
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      burnR.set(100);
      if (introFromFlash) {
        containerOpac.set(0);
        const c = animate(containerOpac, 1, {
          delay: HARBOR_VIDEO_FADE_DELAY_S,
          duration: HARBOR_VIDEO_FADE_DURATION_S,
          ease: HARBOR_VIDEO_FADE_EASE,
        });
        return () => c.stop();
      }
      containerOpac.set(1);
      return;
    }
    if (!introFromFlash) {
      containerOpac.set(1);
      burnR.set(100);
      return;
    }
    containerOpac.set(1);
    burnR.set(0.15);
    const c = animate(burnR, 94, {
      delay: BURN_REVEAL_DELAY_S,
      duration: BURN_REVEAL_DURATION_S,
      ease: BURN_REVEAL_EASE,
    });
    return () => c.stop();
  }, [reducedMotion, introFromFlash, burnR, containerOpac]);

  useEffect(() => {
    if (videoFailed) return;
    const ms = !introFromFlash
      ? 800
      : reducedMotion
        ? (HARBOR_VIDEO_FADE_DELAY_S + HARBOR_VIDEO_FADE_DURATION_S) * 1000 + 450
        : (BURN_REVEAL_DELAY_S + BURN_REVEAL_DURATION_S) * 1000 + 720;
    const id = window.setTimeout(() => setChoicesVisible(true), ms);
    return () => window.clearTimeout(id);
  }, [introFromFlash, reducedMotion, videoFailed]);

  useEffect(() => {
    const prev = prevVideoASrcRef.current;
    if (videoASrc !== HARBOR_VIDEO_SRC) {
      prevVideoASrcRef.current = videoASrc;
      setShowHarborStillA(false);
      return;
    }
    const arrived = prev !== HARBOR_VIDEO_SRC;
    prevVideoASrcRef.current = videoASrc;
    if (arrived) setShowHarborStillA(true);
  }, [videoASrc]);

  useEffect(() => {
    const prev = prevVideoBSrcRef.current;
    if (videoBSrc !== HARBOR_VIDEO_SRC) {
      prevVideoBSrcRef.current = videoBSrc;
      setShowHarborStillB(false);
      return;
    }
    const arrived = prev !== HARBOR_VIDEO_SRC;
    prevVideoBSrcRef.current = videoBSrc;
    if (arrived) setShowHarborStillB(true);
  }, [videoBSrc]);

  /** Crossfade από τρέχον harbor lead → άλλο layer με scene_2 (ίδια ιδέα με το loop). */
  useEffect(() => {
    if (!harborPick || !scene2Track) return;
    const inactiveSrc = scene2Track === "a" ? videoBSrc : videoASrc;
    if (inactiveSrc !== HARBOR_VIDEO_SRC) return;

    const harborEl = scene2Track === "a" ? refB.current : refA.current;
    const scene2El = scene2Track === "a" ? refA.current : refB.current;
    if (!harborEl || !scene2El) return;

    fadingRef.current = true;
    stopFadeAnims();
    setScene2NarrativeFadeOut(false);
    scene2NarrativeFadeLatchedRef.current = false;
    setTextOverlaysHidden(false);

    let cancelled = false;
    let endTimer: number | undefined;

    const runCrossfade = () => {
      if (cancelled) return;
      harborEl.pause();
      scene2El.muted = true;
      scene2El.currentTime = 0;
      void scene2El.play().catch(() => {});

      if (scene2Track === "b") {
        opA.set(1);
        opB.set(0);
        fadeAnimRef.current = [
          animate(opA, 0, { duration: CROSSFADE_SEC, ease: "linear" }),
          animate(opB, 1, { duration: CROSSFADE_SEC, ease: "linear" }),
        ];
      } else {
        opB.set(1);
        opA.set(0);
        fadeAnimRef.current = [
          animate(opB, 0, { duration: CROSSFADE_SEC, ease: "linear" }),
          animate(opA, 1, { duration: CROSSFADE_SEC, ease: "linear" }),
        ];
      }

      endTimer = window.setTimeout(() => {
        if (!cancelled) {
          harborEl.pause();
          fadingRef.current = false;
        }
      }, CROSSFADE_SEC * 1000 + 80);
    };

    const onLoaded = () => {
      if (!cancelled) runCrossfade();
    };

    if (scene2El.readyState >= 2) {
      runCrossfade();
    } else {
      scene2El.addEventListener("loadeddata", onLoaded, { once: true });
    }

    return () => {
      cancelled = true;
      if (endTimer) window.clearTimeout(endTimer);
      scene2El.removeEventListener("loadeddata", onLoaded);
      stopFadeAnims();
    };
  }, [harborPick, scene2Track, videoASrc, videoBSrc, opA, opB, stopFadeAnims]);

  /** Crossfade scene_2 → scene_3 (loop), λίγο πριν το τέλος του scene_2. */
  useEffect(() => {
    if (scene3TransitionId === 0) return;
    if (scene3ModeRef.current) return;
    if (!harborPickRef.current) return;
    const t = scene2TrackRef.current;
    if (!t) return;

    const scene2El = t === "a" ? refA.current : refB.current;
    const scene3El = t === "a" ? refB.current : refA.current;
    if (!scene2El || !scene3El) return;

    fadingRef.current = true;
    stopFadeAnims();
    setScene3OverlayRevealReady(false);

    let cancelled = false;
    let endTimer: number | undefined;

    const runCrossfade = () => {
      if (cancelled) return;
      scene2El.pause();
      if (scene2El.duration && Number.isFinite(scene2El.duration)) {
        scene2El.currentTime = Math.max(0, scene2El.duration - 0.1);
      }
      scene3El.muted = true;
      scene3El.currentTime = 0;
      void scene3El.play().catch(() => {});

      if (t === "a") {
        opA.set(1);
        opB.set(0);
        fadeAnimRef.current = [
          animate(opA, 0, { duration: CROSSFADE_SEC, ease: "linear" }),
          animate(opB, 1, { duration: CROSSFADE_SEC, ease: "linear" }),
        ];
      } else {
        opB.set(1);
        opA.set(0);
        fadeAnimRef.current = [
          animate(opB, 0, { duration: CROSSFADE_SEC, ease: "linear" }),
          animate(opA, 1, { duration: CROSSFADE_SEC, ease: "linear" }),
        ];
      }

      endTimer = window.setTimeout(() => {
        if (!cancelled) {
          scene2El.pause();
          fadingRef.current = false;
          stopFadeAnims();
          if (t === "a") {
            opA.set(0);
            opB.set(1);
          } else {
            opA.set(1);
            opB.set(0);
          }
          setScene3Mode(true);
          setScene2Track(null);
          setScene3OverlayRevealReady(false);
          setTextOverlaysHidden(false);
          setScene3TransitionId(0);
          leadingRef.current = t === "a" ? "b" : "a";
          setVideoASrc(SCENE_3_SRC);
          setVideoBSrc(SCENE_3_SRC);
          const loopEl = t === "a" ? refB.current : refA.current;
          if (loopEl) {
            loopEl.muted = true;
            void loopEl.play().catch(() => {});
          }
        }
      }, CROSSFADE_SEC * 1000 + 80);
    };

    const onLoaded = () => {
      if (!cancelled) runCrossfade();
    };

    if (scene3El.readyState >= 2) {
      runCrossfade();
    } else {
      scene3El.addEventListener("loadeddata", onLoaded, { once: true });
    }

    return () => {
      cancelled = true;
      if (endTimer) window.clearTimeout(endTimer);
      scene3El.removeEventListener("loadeddata", onLoaded);
      stopFadeAnims();
    };
  }, [scene3TransitionId, stopFadeAnims]);

  /** GG WP fade-in μετά το scene_3 — ξεχωριστό effect ώστε το cleanup του crossfade να μην ακυρώνει το timeout. */
  useEffect(() => {
    if (!scene3Mode) return;
    const id = window.setTimeout(() => {
      setScene3OverlayRevealReady(true);
    }, SCENE3_WP_REVEAL_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [scene3Mode]);

  /** One-shot `water_pop.mp3` when the GG WP stack becomes visible (aligned with overlay reveal). */
  useEffect(() => {
    if (!scene3Mode || harborPick === null) {
      ggWpSoundSessionRef.current = "";
      return;
    }
    if (!scene3OverlayRevealReady || isWpFarewell) return;
    const sessionKey = `${harborPick}-${scene3TransitionId}`;
    if (ggWpSoundSessionRef.current === sessionKey) return;
    ggWpSoundSessionRef.current = sessionKey;
    playWaterPopSound();
  }, [scene3Mode, harborPick, scene3OverlayRevealReady, isWpFarewell, scene3TransitionId]);

  /** Στην τελική σκηνή — παύτα τα loop βίντεο. */
  useEffect(() => {
    if (!isWpFarewell) return;
    refA.current?.pause();
    refB.current?.pause();
  }, [isWpFarewell]);

  /** Κεντρικό κείμενο scene_2 — όχι αμέσως μετά την επιλογή· καθυστέρηση + dramatic entrance (ξεχωριστό από cleanup crossfade). */
  useEffect(() => {
    if (scene3Mode || !harborPick || scene2Track === null || textOverlaysHidden) {
      setScene2CenterRevealReady(false);
      return;
    }
    setScene2CenterRevealReady(false);
    const delay = reducedMotion ? SCENE2_NARRATIVE_REVEAL_DELAY_REDUCED_MS : SCENE2_NARRATIVE_REVEAL_DELAY_MS;
    const id = window.setTimeout(() => setScene2CenterRevealReady(true), delay);
    return () => window.clearTimeout(id);
  }, [harborPick, scene2Track, scene3Mode, textOverlaysHidden, reducedMotion]);

  const handleHarborSelect = useCallback(
    (key: HarborChoiceKey) => {
      const leadIsA = opA.get() >= opB.get();
      setHarborPick(key);
      setChoicesVisible(false);
      setScene2NarrativeFadeOut(false);
      scene2NarrativeFadeLatchedRef.current = false;
      setTextOverlaysHidden(false);
      setScene2Failed(false);
      scene3CrossfadeStartedRef.current = false;
      setScene3Mode(false);
      setScene3TransitionId(0);
      setScene3Failed(false);
      setScene3OverlayRevealReady(false);
      setIsWpFarewell(false);

      if (leadIsA) {
        setScene2Track("b");
        setVideoBSrc(SCENE_2_SRC);
      } else {
        setScene2Track("a");
        setVideoASrc(SCENE_2_SRC);
      }
      onHarborChoice?.(key);
    },
    [onHarborChoice, opA, opB],
  );

  const checkNearEnd = useCallback(() => {
    if (!scene3ModeRef.current && harborPickRef.current) return;
    if (scene3ModeRef.current && isWpFarewellRef.current) return;
    const leadKey = leadingRef.current;
    const lead = leadKey === "a" ? refA.current : refB.current;
    const follow = leadKey === "a" ? refB.current : refA.current;
    if (!lead?.duration || !follow || fadingRef.current) return;
    const rem = lead.duration - lead.currentTime;
    if (rem <= CROSSFADE_SEC && rem > 0.02) {
      fadingRef.current = true;
      follow.currentTime = 0;
      void follow.play();
      stopFadeAnims();
      const fadeOpts = { duration: CROSSFADE_SEC, ease: "linear" as const };
      if (leadKey === "a") {
        fadeAnimRef.current = [animate(opA, 0, fadeOpts), animate(opB, 1, fadeOpts)];
      } else {
        fadeAnimRef.current = [animate(opB, 0, fadeOpts), animate(opA, 1, fadeOpts)];
      }
    }
  }, [opA, opB, stopFadeAnims]);

  const onTime = useCallback(
    (which: "a" | "b") => () => {
      if (scene3ModeRef.current) {
        if (isWpFarewellRef.current) return;
        if (which !== leadingRef.current) return;
        checkNearEnd();
        return;
      }
      if (harborPickRef.current && scene2TrackRef.current) {
        if (which === scene2TrackRef.current) {
          const el = which === "a" ? refA.current : refB.current;
          if (el?.duration && Number.isFinite(el.duration)) {
            const rem = el.duration - el.currentTime;
            if (
              rem <= SCENE2_NARRATIVE_FADE_LEAD_S &&
              rem >= 0 &&
              !scene2NarrativeFadeLatchedRef.current
            ) {
              scene2NarrativeFadeLatchedRef.current = true;
              setScene2NarrativeFadeOut(true);
            }
            if (
              rem <= SCENE2_TO_SCENE3_LEAD_S &&
              rem > 0.04 &&
              !scene3CrossfadeStartedRef.current
            ) {
              scene3CrossfadeStartedRef.current = true;
              setScene3OverlayRevealReady(false);
              const t = scene2TrackRef.current;
              if (t === "a") setVideoBSrc(SCENE_3_SRC);
              else setVideoASrc(SCENE_3_SRC);
              setScene3TransitionId((n) => n + 1);
            }
          }
        }
        return;
      }
      if (which !== leadingRef.current) return;
      checkNearEnd();
    },
    [checkNearEnd],
  );

  const onEndedA = useCallback(() => {
    if (scene3ModeRef.current) {
      if (isWpFarewellRef.current) return;
      if (leadingRef.current !== "a") return;
      stopFadeAnims();
      fadingRef.current = false;
      const a = refA.current;
      a?.pause();
      if (a) a.currentTime = 0;
      leadingRef.current = "b";
      opA.set(0);
      opB.set(1);
      return;
    }
    if (harborPickRef.current && scene2TrackRef.current === "a") {
      if (scene3CrossfadeStartedRef.current && !scene3ModeRef.current) return;
      const a = refA.current;
      if (a) {
        a.pause();
        if (a.duration && Number.isFinite(a.duration)) {
          a.currentTime = Math.max(0, a.duration - 0.05);
        }
      }
      window.setTimeout(() => setTextOverlaysHidden(true), 2200);
      return;
    }
    if (harborPickRef.current) return;
    if (leadingRef.current !== "a") return;
    stopFadeAnims();
    fadingRef.current = false;
    const a = refA.current;
    a?.pause();
    if (a) a.currentTime = 0;
    leadingRef.current = "b";
    opA.set(0);
    opB.set(1);
  }, [opA, opB, stopFadeAnims]);

  const onEndedB = useCallback(() => {
    if (scene3ModeRef.current) {
      if (isWpFarewellRef.current) return;
      if (leadingRef.current !== "b") return;
      stopFadeAnims();
      fadingRef.current = false;
      const b = refB.current;
      b?.pause();
      if (b) b.currentTime = 0;
      leadingRef.current = "a";
      opA.set(1);
      opB.set(0);
      return;
    }
    if (harborPickRef.current && scene2TrackRef.current === "b") {
      if (scene3CrossfadeStartedRef.current && !scene3ModeRef.current) return;
      const b = refB.current;
      if (b) {
        b.pause();
        if (b.duration && Number.isFinite(b.duration)) {
          b.currentTime = Math.max(0, b.duration - 0.05);
        }
      }
      window.setTimeout(() => setTextOverlaysHidden(true), 2200);
      return;
    }
    if (harborPickRef.current) return;
    if (leadingRef.current !== "b") return;
    stopFadeAnims();
    fadingRef.current = false;
    const b = refB.current;
    b?.pause();
    if (b) b.currentTime = 0;
    leadingRef.current = "a";
    opA.set(1);
    opB.set(0);
  }, [opA, opB, stopFadeAnims]);

  const onLoadedA = useCallback(() => {
    void refA.current?.play().catch(() => {});
  }, []);

  const onHarborPlayingA = useCallback(() => {
    setShowHarborStillA(false);
  }, []);
  const onHarborPlayingB = useCallback(() => {
    setShowHarborStillB(false);
  }, []);

  useEffect(() => {
    return () => {
      stopFadeAnims();
    };
  }, [stopFadeAnims]);

  const onVideoError = useCallback(
    (which: "a" | "b") => {
      const src = which === "a" ? videoASrc : videoBSrc;
      if (src === SCENE_2_SRC) setScene2Failed(true);
      else if (src === SCENE_3_SRC) setScene3Failed(true);
      else setVideoFailed(true);
    },
    [videoASrc, videoBSrc],
  );

  /** Άλμα στο τελικό loop (scene_3) — χωρίς αναμονή harbor / scene_2. (Skip HUD disabled.) */
  // const skipToFinalScene = useCallback(() => {
  //   stopFadeAnims();
  //   fadingRef.current = false;
  //   scene3CrossfadeStartedRef.current = true;
  //   setChoicesVisible(false);
  //   setScene2NarrativeFadeOut(false);
  //   scene2NarrativeFadeLatchedRef.current = false;
  //   setScene3OverlayRevealReady(false);
  //   setIsWpFarewell(false);
  //   setTextOverlaysHidden(false);
  //   setScene2Failed(false);
  //   setScene3Failed(false);
  //   setScene3Mode(true);
  //   setScene3TransitionId(0);
  //   setScene2Track(null);
  //   setHarborPick((h) => {
  //     if (h === null) onHarborChoice?.("shore");
  //     return h ?? "shore";
  //   });
  //   setVideoASrc(SCENE_3_SRC);
  //   setVideoBSrc(SCENE_3_SRC);
  //   leadingRef.current = "a";
  //   opA.set(1);
  //   opB.set(0);
  //   requestAnimationFrame(() => {
  //     void refA.current?.play().catch(() => {});
  //   });
  // }, [onHarborChoice, stopFadeAnims]);

  /** Επιστροφή στο harbor loop + επιλογές (από WP confirm «I changed my mind»). */
  const resetToHarborScene = useCallback(() => {
    stopFadeAnims();
    fadingRef.current = false;
    scene3CrossfadeStartedRef.current = false;
    scene2NarrativeFadeLatchedRef.current = false;
    setHarborPick(null);
    setScene2Track(null);
    setScene3Mode(false);
    setScene3TransitionId(0);
    setScene3OverlayRevealReady(false);
    setIsWpFarewell(false);
    setScene2NarrativeFadeOut(false);
    setScene2CenterRevealReady(false);
    setTextOverlaysHidden(false);
    setScene2Failed(false);
    setScene3Failed(false);
    setVideoASrc(HARBOR_VIDEO_SRC);
    setVideoBSrc(HARBOR_VIDEO_SRC);
    leadingRef.current = "a";
    opA.set(1);
    opB.set(0);
    setChoicesVisible(true);
    const a = refA.current;
    const b = refB.current;
    a?.pause();
    b?.pause();
    if (a) a.currentTime = 0;
    if (b) b.currentTime = 0;
    requestAnimationFrame(() => {
      void refA.current?.play().catch(() => {});
    });
  }, [stopFadeAnims, opA, opB]);

  const handleWpMindChanged = useCallback(() => {
    resetToHarborScene();
  }, [resetToHarborScene]);

  const handleWpImSure = useCallback(() => {
    if (harborPick !== null) {
      notifyHarborChoiceConfirmed(harborPick);
    }
    setIsWpFarewell(true);
  }, [harborPick]);

  /** Στο harbor πριν την επιλογή — replay HUD → desk με φάκελο· αλλιώς πλήρες replay (burst). */
  const handleHudReplay = useCallback(() => {
    if (harborPick === null && !scene3Mode) {
      (onBackToDesk ?? onReplay)?.();
      return;
    }
    onReplay?.();
  }, [harborPick, scene3Mode, onBackToDesk, onReplay]);

  if (videoFailed) {
    return (
      <>
        <div className="flex min-h-dvh w-full items-center justify-center bg-black px-6 text-center text-sm text-white/60">
          <p>
            Δεν φορτώθηκε το <code className="text-amber-200/90">public/harbor_scene.mp4</code>. Έλεγξε ότι το
            αρχείο υπάρχει και το όνομα είναι ακριβές.
          </p>
        </div>
        {onReplay ? (
          <div className={replayHudAnchorClass}>
            <SceneReplayButton reducedMotion={reducedMotion} onReplay={handleHudReplay} />
          </div>
        ) : null}
      </>
    );
  }

  if (scene2Failed) {
    return (
      <>
        <div className="flex min-h-dvh w-full items-center justify-center bg-black px-6 text-center text-sm text-white/60">
          <p>
            Δεν φορτώθηκε το <code className="text-amber-200/90">public/scene_2.mp4</code>. Βάλε το αρχείο στο{" "}
            <code className="text-amber-200/90">public/</code> folder.
          </p>
        </div>
        {onReplay ? (
          <div className={replayHudAnchorClass}>
            <SceneReplayButton reducedMotion={reducedMotion} onReplay={handleHudReplay} />
          </div>
        ) : null}
      </>
    );
  }

  if (scene3Failed) {
    return (
      <>
        <div className="flex min-h-dvh w-full items-center justify-center bg-black px-6 text-center text-sm text-white/60">
          <p>
            Δεν φορτώθηκε το <code className="text-amber-200/90">public/scene_3_old.mp4</code>. Βάλε το αρχείο στο{" "}
            <code className="text-amber-200/90">public/</code> folder.
          </p>
        </div>
        {onReplay ? (
          <div className={replayHudAnchorClass}>
            <SceneReplayButton reducedMotion={reducedMotion} onReplay={handleHudReplay} />
          </div>
        ) : null}
      </>
    );
  }

  const showBurn = introFromFlash && !reducedMotion;
  const scene2Active = harborPick !== null && scene2Track !== null && !scene3Mode;
  const lines = harborPick ? SCENE2_CENTER_LINES[harborPick] : null;
  /** Κεντρικό κείμενο μόνο στο scene_2· WP μόνο στο scene_3 μετά το reveal. */
  const showCenterNarrative =
    harborPick !== null &&
    scene2Track !== null &&
    lines &&
    !textOverlaysHidden &&
    scene2CenterRevealReady;
  const showWpBand = harborPick !== null && scene3Mode && scene3OverlayRevealReady;
  const showWpStack = showWpBand && !isWpFarewell;

  const videoAIsScene2 = videoASrc === SCENE_2_SRC;
  const videoBIsScene2 = videoBSrc === SCENE_2_SRC;
  const videoAIsHarbor = videoASrc === HARBOR_VIDEO_SRC;
  const videoBIsHarbor = videoBSrc === HARBOR_VIDEO_SRC;

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[100] overflow-hidden bg-black"
        style={{ opacity: containerOpac }}
      >
      <svg className="pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden>
        <defs>
          <filter id={filterId} x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed="17" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <motion.div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          WebkitMaskImage: burnMask,
          maskImage: burnMask,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      >
        <motion.div className="absolute inset-0" style={{ opacity: opA }}>
          {/*
            Single <video> per slot so src changes (e.g. scene_3 → harbor) update in-place.
            `harbor_scene.webp` overlay until `onPlaying`: MP4 can paint black before decode; poster alone is unreliable.
          */}
          <div className="absolute inset-0 overflow-hidden">
            <video
              ref={refA}
              src={videoASrc}
              className={
                (videoAIsHarbor ? "z-0 " : "") +
                (videoAIsScene2
                  ? "absolute left-0 right-0 w-full object-cover object-top"
                  : "absolute inset-0 h-full w-full object-cover")
              }
              style={
                videoAIsScene2
                  ? {
                      top: -SCENE2_TOP_CROP_PX,
                      height: `calc(100% + ${SCENE2_TOP_CROP_PX}px)`,
                    }
                  : undefined
              }
              poster={videoAIsHarbor ? HARBOR_VIDEO_POSTER_SRC : undefined}
              autoPlay={videoAIsHarbor || videoASrc === SCENE_3_SRC}
              muted
              playsInline
              preload="auto"
              aria-hidden
              onLoadedData={videoAIsHarbor ? onLoadedA : undefined}
              onPlaying={videoAIsHarbor ? onHarborPlayingA : undefined}
              onTimeUpdate={onTime("a")}
              onEnded={onEndedA}
              onError={() => onVideoError("a")}
            />
            {videoAIsHarbor && showHarborStillA ? (
              <img
                src={HARBOR_VIDEO_POSTER_SRC}
                alt=""
                aria-hidden
                draggable={false}
                decoding="async"
                className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover select-none"
              />
            ) : null}
          </div>
        </motion.div>
        <motion.div className="absolute inset-0" style={{ opacity: opB }}>
          <div className="absolute inset-0 overflow-hidden">
            <video
              ref={refB}
              src={videoBSrc}
              className={
                (videoBIsHarbor ? "z-0 " : "") +
                (videoBIsScene2
                  ? "absolute left-0 right-0 w-full object-cover object-top"
                  : "absolute inset-0 h-full w-full object-cover")
              }
              style={
                videoBIsScene2
                  ? {
                      top: -SCENE2_TOP_CROP_PX,
                      height: `calc(100% + ${SCENE2_TOP_CROP_PX}px)`,
                    }
                  : undefined
              }
              poster={videoBIsHarbor ? HARBOR_VIDEO_POSTER_SRC : undefined}
              autoPlay={videoBSrc === SCENE_3_SRC}
              muted
              playsInline
              preload="auto"
              aria-hidden
              onPlaying={videoBIsHarbor ? onHarborPlayingB : undefined}
              onTimeUpdate={onTime("b")}
              onEnded={onEndedB}
              onError={() => onVideoError("b")}
            />
            {videoBIsHarbor && showHarborStillB ? (
              <img
                src={HARBOR_VIDEO_POSTER_SRC}
                alt=""
                aria-hidden
                draggable={false}
                decoding="async"
                className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover select-none"
              />
            ) : null}
          </div>
        </motion.div>
      </motion.div>

      {showBurn ? (
        <motion.div
          className="pointer-events-none absolute inset-0 z-[12] mix-blend-screen"
          style={{
            opacity: rimOpacity,
            backgroundImage: rimBg,
            filter: `url(#${filterId})`,
          }}
          aria-hidden
        />
      ) : null}

      <AnimatePresence>
        {showCenterNarrative ? (
          <motion.div
            key="scene2-center"
            className="pointer-events-none absolute inset-0 z-[150] flex items-center justify-center px-6"
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 36, scale: 0.96, filter: "blur(14px)" }
            }
            animate={
              scene2NarrativeFadeOut
                ? { opacity: 0 }
                : reducedMotion
                  ? { opacity: 1 }
                  : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
            }
            exit={{ opacity: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const } }}
            transition={{
              duration: reducedMotion ? 0.12 : scene2NarrativeFadeOut ? 0.55 : 1.15,
              delay: reducedMotion ? 0 : scene2NarrativeFadeOut ? 0 : 0.06,
              ease: scene2NarrativeFadeOut
                ? ([0.32, 0, 0.67, 1] as const)
                : ([0.1, 0.9, 0.2, 1] as const),
            }}
          >
            <div className="desk-cinematic-narrative scene2-center-narrative relative w-full max-w-[min(72rem,96vw)] text-center">
              <div className="desk-cinematic-narrative__sheet" aria-hidden />
              <p className="desk-cinematic-narrative__copy scene2-center-narrative__copy">
                {lines.map((line, i) => (
                  <Fragment key={i}>
                    {i > 0 ? <br /> : null}
                    {line}
                  </Fragment>
                ))}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showWpStack ? (
        <>
          <motion.div
            key="scene2-wp-float"
            className="scene2-wp-float pointer-events-none absolute z-[155]"
            style={{ left: `${wpDesign.leftPx}px`, top: `${wpDesign.topPx}px` }}
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.93, y: 18, filter: "blur(12px)" }
            }
            animate={
              reducedMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
            }
            transition={{
              duration: reducedMotion ? 0.32 : 1.35,
              delay: reducedMotion ? 0 : 0.14,
              ease: reducedMotion ? ([0.22, 1, 0.36, 1] as const) : ([0.08, 0.92, 0.18, 1] as const),
            }}
          >
            <div className="inline-block">
              <div
                className="scene2-wp-float__persp pointer-events-none"
                style={{ ["--wp-gg-title-max-rem" as string]: `${wpDesign.titleMaxRem}rem` } as CSSProperties}
              >
                <div
                  className="scene2-wp-float__inner"
                  style={{
                    transform: `rotateX(${wpDesign.rotateX}deg) rotateZ(${wpDesign.rotateZ}deg) skewX(${wpDesign.skewX}deg) skewY(${wpDesign.skewY}deg) rotateY(${wpDesign.rotateY}deg)`,
                  }}
                >
                  <div className="pointer-events-none">
                    <p className="scene2-wp-float__title" style={{ textShadow: buildWpTitleTextShadow(wpDesign) }}>
                      {wpDesign.wpTitle}
                    </p>
                    <p className="scene2-wp-float__greek-kicker" style={{ textShadow: buildWpSubTextShadow(wpDesign) }}>
                      ΕΤΣΙΙΙΙΙΙΙ?
                    </p>
                    <div className="scene2-wp-float__subs">
                      {[wpDesign.wpSubLine1, wpDesign.wpSubLine2, wpDesign.wpSubLine3]
                        .map((line, i) => ({ line: line.trim(), i }))
                        .filter(({ line }) => line.length > 0)
                        .map(({ line, i }) => (
                          <p key={i} className="scene2-wp-float__sub" style={{ textShadow: buildWpSubTextShadow(wpDesign) }}>
                            {line}
                          </p>
                        ))}
                    </div>
                  </div>
                  <div className="scene2-wp-float__outro pointer-events-auto">
                    <p className="scene2-wp-float__notify-line" style={{ textShadow: buildWpSubTextShadow(wpDesign) }}>
                      Don&apos;t worry — when you close this page, I&apos;ll get notified what you chose.
                    </p>
                    <div className="scene2-wp-float__action-row">
                      <motion.button
                        type="button"
                        className="scene2-wp-float__choice-btn"
                        style={{ textShadow: buildWpSubTextShadow(wpDesign) }}
                        onPointerEnter={uiWpMind.onPointerEnter}
                        onFocus={uiWpMind.onFocus}
                        onClick={uiWpMind.wrapClick(handleWpMindChanged)}
                        whileHover={reducedMotion ? undefined : { scale: 1.04 }}
                        whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                      >
                        I changed my mind — go back
                      </motion.button>
                      <motion.button
                        type="button"
                        className="scene2-wp-float__choice-btn scene2-wp-float__choice-btn--primary"
                        style={{ textShadow: buildWpSubTextShadow(wpDesign) }}
                        onPointerEnter={uiWpSure.onPointerEnter}
                        onFocus={uiWpSure.onFocus}
                        onClick={uiWpSure.wrapClick(handleWpImSure)}
                        whileHover={reducedMotion ? undefined : { scale: 1.04 }}
                        whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                      >
                        I&apos;m sure
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}

      <HarborChoiceOverlay
        reducedMotion={reducedMotion}
        visible={choicesVisible && harborPick === null && !videoFailed && !scene3Mode}
        selected={harborPick}
        onSelect={handleHarborSelect}
      />

      <span className="sr-only">
        {scene3Mode ? "Scene three video" : scene2Active ? "Scene two video" : "Harbor scene video"}
      </span>
      </motion.div>
      <AnimatePresence>
        {isWpFarewell && harborPick ? (
          <motion.div
            key="wp-farewell"
            role="dialog"
            aria-modal
            aria-labelledby="wp-farewell-copy"
            className={FAREWELL_BY_CHOICE[harborPick].wrapClass}
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 52, scale: 0.9, filter: "blur(20px)" }
            }
            animate={
              reducedMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
            }
            exit={{ opacity: 0, transition: { duration: 0.38, ease: [0.32, 0, 0.67, 1] as const } }}
            transition={{
              duration: reducedMotion ? 0.12 : WP_FAREWELL_ENTRANCE_DURATION_S,
              delay: reducedMotion ? 0 : WP_FAREWELL_ENTRANCE_DELAY_S,
              ease: reducedMotion ? ([0.22, 1, 0.36, 1] as const) : ([0.06, 0.92, 0.18, 1] as const),
            }}
          >
            <div className="wp-farewell__vignette pointer-events-none" aria-hidden />
            <div className="wp-farewell__content desk-cinematic-narrative relative mx-auto w-full max-w-[min(72rem,96vw)] px-5 text-center">
              <div className="desk-cinematic-narrative__sheet" aria-hidden />
              <p id="wp-farewell-copy" className="desk-cinematic-narrative__copy m-0">
                {FAREWELL_BY_CHOICE[harborPick].line1}
                <br />
                {FAREWELL_BY_CHOICE[harborPick].line2}
              </p>
              {(onBackToDesk ?? onReplay) ? (
                <motion.button
                  type="button"
                  className="wp-farewell__dismiss"
                  onPointerEnter={uiFarewellDismiss.onPointerEnter}
                  onFocus={uiFarewellDismiss.onFocus}
                  onClick={uiFarewellDismiss.wrapClick(() => {
                    if (onBackToDesk) {
                      onBackToDesk({ farewellChoice: harborPick });
                    } else {
                      onReplay?.();
                    }
                  })}
                  whileHover={reducedMotion ? undefined : { scale: 1.03 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                >
                  Back to desk
                </motion.button>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {onReplay ? (
        <div className={`${replayHudAnchorClass} flex flex-col items-start gap-2`}>
          <SceneReplayButton reducedMotion={reducedMotion} onReplay={handleHudReplay} />
          {/* Scene skip-to-end (jump to scene_3 before GG/WP) — disabled for now
          {!scene3Mode ? <SceneSkipToEndButton reducedMotion={reducedMotion} onSkip={skipToFinalScene} /> : null}
          */}
        </div>
      ) : null}
    </>
  );
}
