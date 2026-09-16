import { DomMutationLease } from "../dom/dom-mutation-lease";
import { isHTMLElement, isNode, ownerDocument } from "../utils/utils";
import { focusableTourControls, isFocusable } from "./focusable";

type FocusDirection = "advance" | "previous";

export interface FocusGuardScope {
  popover: HTMLElement;
  direction: FocusDirection;
  allowedTarget?: HTMLElement | null;
  allowTargetInteraction?: boolean;
  autoFocus?: boolean;
  fallback?: HTMLElement | null;
}

export class FocusGuard {
  private initialFocus: HTMLElement | null = null;
  private document: Document | null = null;
  private popover: HTMLElement | null = null;
  private allowedTarget: HTMLElement | null = null;
  private allowTargetInteraction = false;
  private fallback: HTMLElement | null = null;
  private fallbackLease: DomMutationLease | null = null;
  private direction: FocusDirection = "advance";
  private active = false;
  private redirecting = false;

  private readonly handleFocusIn = (event: FocusEvent) => {
    if (!this.active || this.redirecting) {
      return;
    }

    const target = event.target;
    if (!isNode(target, this.popover) || this.isAllowed(target)) {
      return;
    }

    this.focusFallback();
  };

  activate(scope: FocusGuardScope) {
    const document = ownerDocument(scope.popover);
    if (!document) return;
    if (this.active && this.document !== document) this.deactivate();
    const opening = !this.active;
    if (opening) {
      this.document = document;
      this.captureInitialFocus(scope.popover);
      this.document.addEventListener("focusin", this.handleFocusIn, true);
      this.active = true;
    }

    this.update(scope);
    const currentFocus = this.document?.activeElement;
    if (
      scope.autoFocus !== false ||
      !isNode(currentFocus, scope.popover) ||
      !this.isAllowed(currentFocus)
    ) {
      this.focusFallback(opening);
    }
  }

  update(scope: FocusGuardScope) {
    this.popover = scope.popover;
    this.allowedTarget = scope.allowedTarget ?? null;
    this.allowTargetInteraction = scope.allowTargetInteraction ?? false;
    this.direction = scope.direction;
    this.setFallback(scope.fallback ?? null);
  }

  focus() {
    if (this.active) this.focusFallback();
  }

  /**
   * Remembers the element focus returns to when the guard deactivates. The driver calls it before
   * making the rest of the page inert, because inerting an ancestor blurs the focused element.
   * Does nothing once a focus is remembered or the guard is active.
   */
  captureInitialFocus(reference: HTMLElement) {
    if (this.active || this.initialFocus) return;
    const activeElement = ownerDocument(reference)?.activeElement;
    this.initialFocus = isHTMLElement(activeElement, reference) ? activeElement : null;
  }

  deactivate() {
    const focusToRestore = this.release();
    if (focusToRestore?.isConnected) {
      focusToRestore.focus();
    }
  }

  /**
   * Stops guarding and returns the element focus should go back to, without moving focus. Lets
   * the caller restore it once the page has left `inert`: screen readers ignore focus moved onto
   * content their accessibility tree has not caught up with yet.
   */
  release(): HTMLElement | null {
    const focusToRestore = this.initialFocus;
    // A capture from a show that never activated must not leak into the next tour.
    this.initialFocus = null;
    if (!this.active) return null;

    this.document?.removeEventListener("focusin", this.handleFocusIn, true);
    this.document = null;
    this.active = false;
    this.popover = null;
    this.allowedTarget = null;
    this.allowTargetInteraction = false;
    this.restoreFallback();
    return focusToRestore;
  }

  private isAllowed(target: Node) {
    if (target === this.fallback) return true;

    const popover = this.popover;
    if (popover && belongsToScope(target, popover)) return true;

    return (
      this.allowTargetInteraction &&
      !!this.allowedTarget &&
      belongsToScope(target, this.allowedTarget)
    );
  }

  private focusFallback(opening?: boolean) {
    const popover = this.popover;
    if (!popover?.isConnected) {
      return;
    }

    const dialog = isFocusable(popover) && popover;
    // Opening lands on the dialog itself: screen readers announce its name and description there,
    // then Tab reaches the buttons. Focus already on the dialog stays there, since moving it to a
    // button would make VoiceOver drop the live region announcing the new step.
    const nextFocus =
      ((opening || this.document?.activeElement === popover) && dialog) ||
      this.findFocusable(popover, this.direction) ||
      dialog ||
      (this.fallback?.isConnected && isFocusable(this.fallback) && this.fallback);
    if (!nextFocus) return;

    this.redirecting = true;
    nextFocus.focus();
    this.redirecting = false;
  }

  private setFallback(fallback: HTMLElement | null) {
    if (this.fallback === fallback) return;
    this.restoreFallback();
    this.fallback = fallback;
    if (!fallback) return;
    this.fallbackLease = new DomMutationLease(fallback);
    this.fallbackLease.setAttribute("tabindex", "-1");
  }

  private restoreFallback() {
    this.fallbackLease?.release();
    this.fallbackLease = null;
    this.fallback = null;
  }

  private findFocusable(root: HTMLElement, direction: FocusDirection) {
    const candidates = focusableTourControls(root);
    const find = (trigger: FocusDirection) =>
      candidates.find((candidate) => candidate.matches(`[data-glow-tour-${trigger}-trigger]`));
    // Going back onto a step where Back is unavailable, typically the first one, lands on Advance:
    // focus left on an unavailable control is a dead end, and NVDA re-reads the whole dialog.
    return (direction === "previous" && find("previous")) || find("advance") || null;
  }
}

function belongsToScope(target: Node, scope: HTMLElement) {
  if (!scope.contains(target)) return false;
  const element = isHTMLElement(target, scope) ? target : target.parentElement;
  if (!element) return target === scope;
  return (
    element.closest<HTMLElement>("[data-glow-tour-root]") ===
    scope.closest<HTMLElement>("[data-glow-tour-root]")
  );
}
