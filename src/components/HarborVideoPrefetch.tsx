import { useEffect, useRef } from "react";

/** Same asset as `PostEnvelopeScene` harbor loop — keep paths in sync. */
const HARBOR_VIDEO_SRC = "/harbor_scene.mp4";

/**
 * Hidden off-screen `<video>` so the browser starts fetching/decoding harbor footage as soon as
 * the desk is shown (before the user opens the envelope). Removes ~1s black wait on first paint.
 */
export function HarborVideoPrefetch() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    ref.current?.load();
  }, []);

  return (
    <video
      ref={ref}
      src={HARBOR_VIDEO_SRC}
      preload="auto"
      muted
      playsInline
      aria-hidden
      className="pointer-events-none fixed top-0 left-[-9999px] h-2 w-2 opacity-0"
    />
  );
}
