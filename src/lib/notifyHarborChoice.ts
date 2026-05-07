import type { HarborChoiceKey } from "../components/HarborChoiceOverlay";

const path = "/api/notify-harbor-choice";

function endpoint(): string {
  const base = import.meta.env.VITE_NOTIFY_API_URL as string | undefined;
  if (base && base.length > 0) {
    return `${base.replace(/\/$/, "")}${path}`;
  }
  return path;
}

/** Fire-and-forget: tells the deployed API to email you the confirmed harbor choice. */
export function notifyHarborChoiceConfirmed(choice: HarborChoiceKey): void {
  void fetch(endpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice }),
  })
    .then(async (res) => {
      if (res.ok) return;
      let msg = "";
      try {
        const j = (await res.json()) as { error?: string; detail?: string; code?: string };
        if (j.detail) msg = j.detail;
        else if (j.error) msg = j.error;
        if (j.code) msg = msg ? `${msg} (${j.code})` : String(j.code);
      } catch {
        msg = "(non-JSON response)";
      }
      console.warn("[notifyHarborChoice] API failed:", res.status, res.url, msg || "no detail");
    })
    .catch(() => {
      console.warn("[notifyHarborChoice] network error — is /api reachable? (Vercel env + rewrite)");
    });
}
