import { useCallback, useRef, useState } from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { DeskOptionImagePrefetch } from "./components/DeskOptionImagePrefetch";
import { DeskScene } from "./components/DeskScene";
import { HarborVideoPrefetch } from "./components/HarborVideoPrefetch";
import { LoadingGate } from "./components/LoadingGate";
import { OrbCursor } from "./components/OrbCursor";

/** Ίδιο με `MUSIC_VOLUME` στο DeskScene — ξεκινάει στο gesture του loader. */
const DESK_LOOP_PRIME_VOLUME = 0.22;

export default function App() {
  const sysReducedMotion = useReducedMotion();
  const [sceneReady, setSceneReady] = useState(false);
  const [loaderMounted, setLoaderMounted] = useState(true);
  const deskLoopRef = useRef<HTMLAudioElement>(null);

  const primeDeskLoopFromGesture = useCallback(() => {
    const a = deskLoopRef.current;
    if (!a) return;
    a.muted = false;
    a.volume = DESK_LOOP_PRIME_VOLUME;
    try {
      void a.play();
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="relative min-h-dvh bg-white">
      <audio
        ref={deskLoopRef}
        src="/intro_music.mp3"
        loop
        preload="auto"
        className="hidden"
        aria-hidden
      />
      <OrbCursor />
      <DeskOptionImagePrefetch />
      {sceneReady ? (
        <>
          <HarborVideoPrefetch />
          <DeskScene reducedMotion={!!sysReducedMotion} deskLoopRef={deskLoopRef} />
        </>
      ) : null}

      <AnimatePresence>
        {loaderMounted ? (
          <LoadingGate
            key="loading"
            reducedMotion={!!sysReducedMotion}
            onUserAudioPrime={primeDeskLoopFromGesture}
            onReady={() => {
              setSceneReady(true);
              setLoaderMounted(false);
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
