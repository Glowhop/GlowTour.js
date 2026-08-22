import { focusableElements, isFocusable } from "./focusable";

type FocusDirection = "next" | "back";

export interface FocusGuardScope {
  popover: HTMLElement;
  direction: FocusDirection;
  allowedTarget?: HTMLElement | null;
  allowTargetInteraction?: boolean;
  autoFocus?: boolean;
}

export class FocusGuard {
  private initialFocus: HTMLElement | null = null;
  private popover: HTMLElement | null = null;
  private allowedTarget: HTMLElement | null = null;
  private allowTargetInteraction = false;
  private direction: FocusDirection = "next";
  private active = false;
  private redirecting = false;

  private readonly handleFocusIn = (event: FocusEvent) => {
    if (!this.active || this.redirecting) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node) || this.isAllowed(target)) {
      return;
    }

    this.focusFallback();
  };

  activate(scope: FocusGuardScope) {
    if (!this.active) {
      this.initialFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.addEventListener("focusin", this.handleFocusIn, true);
      this.active = true;
    }

    this.update(scope);
    if (scope.autoFocus !== false) {
      this.focusFallback();
    }
  }

  update(scope: FocusGuardScope) {
    this.popover = scope.popover;
    this.allowedTarget = scope.allowedTarget ?? null;
    this.allowTargetInteraction = scope.allowTargetInteraction ?? false;
    this.direction = scope.direction;
  }

  focus() {
    if (this.active) this.focusFallback();
  }

  deactivate() {
    if (!this.active) {
      return;
    }

    document.removeEventListener("focusin", this.handleFocusIn, true);
    this.active = false;
    this.popover = null;
    this.allowedTarget = null;
    this.allowTargetInteraction = false;

    const focusToRestore = this.initialFocus;
    this.initialFocus = null;

    if (focusToRestore?.isConnected) {
      focusToRestore.focus();
    }
  }

  private isAllowed(target: Node) {
    if (this.popover?.contains(target)) {
      return true;
    }

    return (
      this.allowTargetInteraction && !!this.allowedTarget && this.allowedTarget.contains(target)
    );
  }

  private focusFallback() {
    const popover = this.popover;
    if (!popover?.isConnected) {
      return;
    }

    const nextFocus = this.findFocusable(popover, this.direction) ?? popover;

    this.redirecting = true;
    nextFocus.focus();
    this.redirecting = false;
  }

  private findFocusable(root: HTMLElement, direction: FocusDirection) {
    const candidates = focusableElements(root);
    const orderedSelectors =
      direction === "next"
        ? ["[data-glow-tour-next-trigger]", "[data-glow-tour-back-trigger]"]
        : ["[data-glow-tour-back-trigger]", "[data-glow-tour-next-trigger]"];

    for (const selector of orderedSelectors) {
      for (const candidate of candidates) {
        if (candidate.matches(selector) && isFocusable(candidate)) {
          return candidate;
        }
      }
    }

    return candidates[0] ?? null;
  }
}
