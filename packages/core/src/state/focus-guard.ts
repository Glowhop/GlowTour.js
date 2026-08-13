const FOCUSABLE_SELECTOR = [
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

export interface FocusGuardScope {
  popover: HTMLElement;
  allowedTarget?: HTMLElement | null;
  allowTargetInteraction?: boolean;
  autoFocus?: boolean;
}

export class FocusGuard {
  private initialFocus: HTMLElement | null = null;
  private popover: HTMLElement | null = null;
  private allowedTarget: HTMLElement | null = null;
  private allowTargetInteraction = false;
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

    const nextFocus = this.findFocusable(popover) ?? popover;

    this.redirecting = true;
    nextFocus.focus();
    this.redirecting = false;
  }

  private findFocusable(root: HTMLElement) {
    const candidates = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);

    for (const candidate of Array.from(candidates)) {
      if (this.isFocusable(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private isFocusable(element: HTMLElement) {
    if (element.hasAttribute("disabled") || element.getAttribute("aria-hidden") === "true") {
      return false;
    }

    const style = window.getComputedStyle(element);
    return style.visibility !== "hidden" && style.display !== "none";
  }
}
