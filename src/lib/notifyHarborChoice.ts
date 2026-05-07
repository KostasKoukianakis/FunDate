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
  }).catch(() => {
    /* network / missing API in local Vite — ignore */
  });
}
