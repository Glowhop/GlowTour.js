export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export const TOUR_TRIGGER_SELECTOR = [
  "[data-glow-tour-previous-trigger]",
  "[data-glow-tour-cancel-trigger]",
  "[data-glow-tour-advance-trigger]",
].join(",");

export function focusableElements(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isFocusable);
}

export function focusableElementsOwnedBy(root: HTMLElement) {
  const ownerRoot = root.closest<HTMLElement>("[data-glow-tour-root]");
  return focusableElements(root).filter(
    (element) => element.closest<HTMLElement>("[data-glow-tour-root]") === ownerRoot,
  );
}

export function focusableTourControls(root: HTMLElement) {
  return focusableElementsOwnedBy(root).filter((element) =>
    element.matches(TOUR_TRIGGER_SELECTOR),
  );
}

export function isFocusable(element: HTMLElement) {
  if (
    element.hasAttribute("disabled") ||
    element.hasAttribute("hidden") ||
    element.getAttribute("aria-disabled") === "true" ||
    element.getAttribute("aria-hidden") === "true" ||
    element.closest("[hidden], [inert], [aria-hidden='true']") !== null
  )
    return false;

  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const style = window.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") return false;
  }
  return true;
}
