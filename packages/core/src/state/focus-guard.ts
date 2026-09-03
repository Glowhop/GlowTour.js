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
    if (!this.active) {
      this.document = document;
      this.initialFocus = isHTMLElement(this.document.activeElement, scope.popover)
        ? this.document.activeElement
        : null;
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
      this.focusFallback();
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

  deactivate() {
    if (!this.active) {
      return;
    }

    this.document?.removeEventListener("focusin", this.handleFocusIn, true);
    this.document = null;
    this.active = false;
    this.popover = null;
    this.allowedTarget = null;
    this.allowTargetInteraction = false;
    this.restoreFallback();

    const focusToRestore = this.initialFocus;
    this.initialFocus = null;

    if (focusToRestore?.isConnected) {
      focusToRestore.focus();
    }
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

  private focusFallback() {
    const popover = this.popover;
    if (!popover?.isConnected) {
      return;
    }

    const nextFocus =
      this.findFocusable(popover, this.direction) ??
      (isFocusable(popover)
        ? popover
        : this.fallback?.isConnected && isFocusable(this.fallback)
          ? this.fallback
          : null);
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
    const selector =
      direction === "advance"
        ? "[data-glow-tour-advance-trigger]"
        : "[data-glow-tour-previous-trigger]";

    return candidates.find((candidate) => candidate.matches(selector)) ?? null;
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
