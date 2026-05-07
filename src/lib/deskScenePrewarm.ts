/**
 * Desk + envelope + post-farewell option art — keep `index.html` `<link rel="preload" as="image">`
 * list in sync for earliest byte fetch.
 * Option overlays are listed first so `decodeAllDeskScenePrewarmImages` can decode them before other art.
 */
export const DESK_OPTION_OVERLAY_PREWARM_URLS = [
  "/desk_option1.webp",
  "/desk_option2.webp",
  "/desk_option3.webp",
] as const;

export const DESK_SCENE_PREWARM_URLS = [
  ...DESK_OPTION_OVERLAY_PREWARM_URLS,
  "/desk.png",
  /** Harbor `<video>` poster until `harbor_scene.mp4` decodes (e.g. after «I changed my mind»). */
  "/harbor_scene.webp",
  "/hero.webp",
  "/envelope.webp",
  "/envelope_hover.webp",
  "/envelope.svg",
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
  const rest = DESK_SCENE_PREWARM_URLS.filter(
    (u) => !(DESK_OPTION_OVERLAY_PREWARM_URLS as readonly string[]).includes(u),
  );
  return Promise.all(DESK_OPTION_OVERLAY_PREWARM_URLS.map((u) => waitImageDecode(u)))
    .then(() => Promise.all(rest.map((u) => waitImageDecode(u))))
    .then(() => {});
}
