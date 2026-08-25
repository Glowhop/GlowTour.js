import type { WorkflowDirection } from "../types";
import {
  FOCUSABLE_SELECTOR,
  focusableElements,
  focusableTourControls,
  isFocusable,
} from "./focusable";

export interface FocusGuardScope {
  popover: HTMLElement;
  direction: WorkflowDirection;
  allowedTarget?: HTMLElement | null;
  allowTargetInteraction?: boolean;
  autoFocus?: boolean;
  fallback?: HTMLElement | null;
}

export class FocusGuard {
  private initialFocus: HTMLElement | null = null;
  private popover: HTMLElement | null = null;
  private allowedTarget: HTMLElement | null = null;
  private allowTargetInteraction = false;
  private fallback: HTMLElement | null = null;
  private fallbackTabIndex: string | null = null;
  private direction: WorkflowDirection = "next";
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
    const currentFocus = document.activeElement;
    if (
      scope.autoFocus !== false ||
      !(currentFocus instanceof Node) ||
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

    document.removeEventListener("focusin", this.handleFocusIn, true);
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
    if (popover?.contains(target)) {
      if (target === popover) return true;
      return this.containsFocusable(popover, focusableTourControls(popover), target);
    }

    return (
      this.allowTargetInteraction &&
      !!this.allowedTarget &&
      this.allowedTarget.contains(target) &&
      this.containsFocusable(
        this.allowedTarget,
        focusableElements(this.allowedTarget),
        target,
        true,
      )
    );
  }

  private containsFocusable(
    root: HTMLElement,
    candidates: HTMLElement[],
    target: Node,
    includeRoot = false,
  ) {
    if (includeRoot && target === root && root.matches(FOCUSABLE_SELECTOR) && isFocusable(root)) {
      return true;
    }
    return candidates.some((candidate) => candidate === target || candidate.contains(target));
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
    this.fallbackTabIndex = fallback.getAttribute("tabindex");
    fallback.setAttribute("tabindex", "-1");
  }

  private restoreFallback() {
    const fallback = this.fallback;
    if (!fallback) return;
    if (this.fallbackTabIndex === null) fallback.removeAttribute("tabindex");
    else fallback.setAttribute("tabindex", this.fallbackTabIndex);
    this.fallback = null;
    this.fallbackTabIndex = null;
  }

  private findFocusable(root: HTMLElement, direction: WorkflowDirection) {
    const candidates = focusableTourControls(root);
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
