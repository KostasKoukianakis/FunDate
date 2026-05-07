import { DESK_OPTION_OVERLAY_PREWARM_URLS } from "../lib/deskScenePrewarm";

/**
 * Hidden images so option overlays start fetching/decoding as soon as the app mounts (before the desk
 * is shown), reducing delay when «Back to desk» reveals desk_option1/2/3.webp.
 */
export function DeskOptionImagePrefetch() {
  return (
    <div
      className="pointer-events-none fixed top-0 left-[-9999px] h-px w-px overflow-hidden opacity-0"
      aria-hidden
    >
      {DESK_OPTION_OVERLAY_PREWARM_URLS.map((src) => (
        <img key={src} src={src} alt="" decoding="async" loading="eager" fetchPriority="high" />
      ))}
    </div>
  );
}
