/**
 * Desk + envelope + post-farewell option art — keep `index.html` `<link rel="preload" as="image">`
 * list in sync for earliest byte fetch.
 */
export const DESK_SCENE_PREWARM_URLS = [
  "/desk.png",
  /** Harbor `<video>` poster + LoadingGate hero still — avoids blank frame while MP4 decodes. */
  "/hero.webp",
  "/envelope.webp",
  "/envelope_hover.webp",
  "/envelope.svg",
  "/desk_option1.webp",
  "/desk_option2.webp",
  "/desk_option3.webp",
  "/indicator.png",
] as const;

export function waitImageDecode(src: string): Promise<void> {
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

export function decodeAllDeskScenePrewarmImages(): Promise<void> {
  return Promise.all(DESK_SCENE_PREWARM_URLS.map((u) => waitImageDecode(u))).then(() => {});
}
