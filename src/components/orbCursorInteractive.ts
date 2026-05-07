const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  '[role="button"]:not([disabled]):not([aria-disabled="true"])',
  '[role="link"]',
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "label",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
  ".cursor-pointer",
  "[data-cursor-hover]",
].join(",");

/** True αν το στοιχείο (ή ancestor) είναι «clickable» — τότε δείχνουμε `cursor_hover.svg`. */
export function isOrbInteractiveHoverTarget(el: Element | null): boolean {
  if (!el || el === document.body || el === document.documentElement) return false;
  if ((el as HTMLElement).closest?.(".orb-cursor-follow")) return false;
  return (el as HTMLElement).closest?.(INTERACTIVE_SELECTOR) != null;
}
