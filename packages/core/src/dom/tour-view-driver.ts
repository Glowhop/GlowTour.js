import OverlayElement from "../elements/overlay";
import PointerElement from "../elements/pointer";
import PopoverElement from "../elements/popover";
import type { ActiveStep } from "../runtime/active-step";
import { FocusGuard } from "../state/focus-guard";
import type { TourDirection } from "../types";
import { isInViewport } from "../utils/utils";

const DEFAULT_SCROLL_END_TIMEOUT = 1000;
const DEFAULT_SHORTCUTS = {
  back: ["ArrowLeft", "Backspace"],
  cancel: ["Escape"],
  next: ["Enter", "ArrowRight"],
} as const;
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export interface TourViewCommands {
  advance(): Promise<void>;
  previous(): Promise<void>;
  cancel(): Promise<void>;
}

export interface TourViewDriver<T> {
  show(step: ActiveStep<T>, direction: TourDirection, signal: AbortSignal): Promise<void> | void;
  clear(signal: AbortSignal): Promise<void> | void;
  dispose(): void;
  setCommands?(commands: TourViewCommands): void;
}

export class NoopTourViewDriver<T> implements TourViewDriver<T> {
  show(_step: ActiveStep<T>, _direction: TourDirection, _signal: AbortSignal): void {}

  clear(_signal: AbortSignal): void {}

  dispose(): void {}
}

export class DomTourViewDriver<T> implements TourViewDriver<T> {
  private readonly focusGuard = new FocusGuard();
  private readonly stepCleanups: Array<() => void> = [];
  private commands: TourViewCommands | null;
  private currentStep: ActiveStep<T> | null = null;
  private disposed = false;
  private lastPopoverRect: DOMRect | null = null;
  private lastTargetRect: DOMRect | null = null;
  private overlay: OverlayElement<T> | null = null;
  private pointer: PointerElement<T> | null = null;
  private popover: PopoverElement<T> | null = null;
  private rafId: number | null = null;
  private root: HTMLElement | null = null;
  private scrollAbort: AbortController | null = null;

  constructor(commands?: TourViewCommands) {
    this.commands = commands ?? null;
  }

  setCommands(commands: TourViewCommands) {
    if (!this.disposed) this.commands = commands;
  }

  registerRoot(element: HTMLElement | null) {
    if (!this.disposed) this.root = element;
  }

  registerOverlay(element: SVGSVGElement | null) {
    if (this.disposed) return;
    this.overlay = element ? new OverlayElement<T>(element) : null;
    if (this.currentStep && this.lastTargetRect) void this.activateRegisteredElements();
  }

  registerPopover(element: HTMLElement | null) {
    if (this.disposed) return;
    this.popover = element ? new PopoverElement<T>(element) : null;
    if (this.currentStep && this.lastTargetRect) void this.activateRegisteredElements();
  }

  registerPointer(element: HTMLElement | null) {
    if (this.disposed) return;
    this.pointer = element ? new PointerElement<T>(element) : null;
    if (this.currentStep && this.lastTargetRect) void this.activateRegisteredElements();
  }

  async show(step: ActiveStep<T>, direction: TourDirection, signal: AbortSignal): Promise<void> {
    if (this.disposed) return;
    this.cleanupStepResources();
    this.currentStep = step;
    this.lastTargetRect = null;
    this.lastPopoverRect = null;
    const target = step.target;
    if (!target) return;

    await this.scrollTargetIntoView(step, target, signal);
    this.throwIfAborted(signal);
    this.initializeElements(step);
    const targetRect = target.getBoundingClientRect();
    await this.appear(targetRect, step);
    this.throwIfAborted(signal);
    this.lastTargetRect = copyRect(targetRect);
    const popover = this.popover?.getElement();
    this.lastPopoverRect = popover ? copyRect(popover.getBoundingClientRect()) : null;
    this.activateFocus(step, target, direction);
    this.attachStepResources(step, target);
  }

  async clear(_signal: AbortSignal): Promise<void> {
    this.cleanupStepResources();
    this.focusGuard.deactivate();
    this.currentStep = null;
    this.lastTargetRect = null;
    this.lastPopoverRect = null;
    this.popover?.getElement()?.removeAttribute("aria-modal");
    await Promise.allSettled([
      this.overlay?.disappear() ?? Promise.resolve(),
      this.popover?.disappear() ?? Promise.resolve(),
      this.pointer?.disappear() ?? Promise.resolve(),
    ]);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cleanupStepResources();
    this.focusGuard.deactivate();
    this.currentStep = null;
    this.commands = null;
    void this.overlay?.disappear();
    void this.popover?.disappear();
    void this.pointer?.disappear();
    this.overlay = null;
    this.popover = null;
    this.pointer = null;
    this.root = null;
  }

  private async activateRegisteredElements() {
    const step = this.currentStep;
    const targetRect = this.lastTargetRect;
    if (this.disposed || !step || !targetRect) return;
    this.initializeElements(step);
    await this.appear(targetRect, step);
  }

  private initializeElements(step: ActiveStep<T>) {
    const interactionAllowed = step.behavior?.allowInteraction === true;
    this.overlay?.initializeProps();
    this.overlay?.setAnimationOptions(animationOptions(step.overlay));
    this.overlay?.setInteractionAllowed(interactionAllowed);
    this.popover?.initializeProps();
    this.popover?.setAnimationOptions(animationOptions(step.popover));
    const popover = this.popover?.getElement();
    if (popover instanceof HTMLElement) {
      if (interactionAllowed) popover.removeAttribute("aria-modal");
      else popover.setAttribute("aria-modal", "true");
    }
    this.pointer?.initializeProps();
    this.pointer?.setAnimationOptions(animationOptions(step.indicator));
  }

  private async appear(targetRect: DOMRect, step: ActiveStep<T>) {
    const pointerEnabled = this.isPointerEnabled(step);
    const popoverPlacement = this.popover?.resolvePosition(targetRect, step).placement;
    await Promise.allSettled([
      this.overlay?.moveToTarget(targetRect, step) ?? Promise.resolve(),
      this.popover?.moveToTarget(targetRect, step, true) ?? Promise.resolve(),
      pointerEnabled
        ? (this.pointer?.moveToTarget(targetRect, step, true, popoverPlacement) ??
          Promise.resolve())
        : (this.pointer?.disappear() ?? Promise.resolve()),
    ]);
  }

  private attachStepResources(step: ActiveStep<T>, target: HTMLElement) {
    const invalidate = () => this.schedulePosition();
    this.listen(window, "resize", invalidate, { passive: true });
    this.listen(window, "scroll", invalidate, { capture: true, passive: true });
    const observer = new ResizeObserver(invalidate);
    observer.observe(target);
    const popover = this.popover?.getElement();
    if (popover) observer.observe(popover);
    this.stepCleanups.push(() => observer.disconnect());
    this.stepCleanups.push(
      step.props.subscribe(() => {
        this.syncControlState(step);
        this.syncShortcutLabels(step);
        invalidate();
      }),
    );
    for (const handler of step.definition.eventHandlers) {
      const listener = (event: Event) => {
        void handler.callback(
          event,
          step.props,
          () => this.command("advance"),
          () => this.command("previous"),
          () => this.command("cancel"),
        );
      };
      this.listen(target, handler.event, listener);
    }
    this.listen(window, "keydown", (event) => this.handleKeydown(event as KeyboardEvent));
    this.attachButtonHandlers(step);
    this.syncControlState(step);
    this.syncShortcutLabels(step);
    if (step.behavior?.targetTracking === "continuous") this.schedulePosition();
  }

  private listen(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ) {
    target.addEventListener(type, listener, options);
    this.stepCleanups.push(() => target.removeEventListener(type, listener, options));
  }

  private schedulePosition() {
    if (this.disposed || !this.currentStep || this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.updatePosition();
      if (this.currentStep?.behavior?.targetTracking === "continuous") this.schedulePosition();
    });
  }

  private updatePosition() {
    const step = this.currentStep;
    const target = step?.target;
    if (this.disposed || !step || !target) return;
    const targetRect = target.getBoundingClientRect();
    const popoverRect = this.popover?.getElement()?.getBoundingClientRect() ?? null;
    const targetChanged = !rectEqual(targetRect, this.lastTargetRect);
    const popoverChanged = !rectEqual(popoverRect, this.lastPopoverRect);
    if (!targetChanged && !popoverChanged) return;
    if (targetChanged) this.overlay?.updatePosition(targetRect, step);
    if (targetChanged || popoverChanged) {
      const popoverPlacement = this.popover?.resolvePosition(targetRect, step).placement;
      this.popover?.updatePosition(targetRect, step);
      if (this.isPointerEnabled(step))
        this.pointer?.updatePosition(targetRect, step, popoverPlacement);
    }
    this.lastTargetRect = copyRect(targetRect);
    this.lastPopoverRect = popoverRect ? copyRect(popoverRect) : null;
  }

  private handleKeydown(event: KeyboardEvent) {
    const step = this.currentStep;
    if (
      !step ||
      event.defaultPrevented ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    if (event.key === "Tab" && step.behavior?.allowInteraction !== true) {
      this.loopFocus(event);
      return;
    }
    if (isEditable(event.target)) return;
    const shortcuts = step.popover?.keyboardShortcuts;
    if (
      (shortcuts?.next ?? DEFAULT_SHORTCUTS.next).includes(event.key) &&
      step.props.get().disableNextButton !== true
    ) {
      event.preventDefault();
      void this.command("advance");
    } else if (
      (shortcuts?.back ?? DEFAULT_SHORTCUTS.back).includes(event.key) &&
      step.props.get().disableBackButton !== true
    ) {
      event.preventDefault();
      void this.command("previous");
    } else if ((shortcuts?.cancel ?? DEFAULT_SHORTCUTS.cancel).includes(event.key)) {
      event.preventDefault();
      void this.command("cancel");
    }
  }

  private loopFocus(event: KeyboardEvent) {
    const popover = this.popover?.getElement();
    if (!(popover instanceof HTMLElement)) return;
    const focusable = Array.from(popover.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      isFocusable,
    );
    if (focusable.length === 0) {
      event.preventDefault();
      popover.focus();
      return;
    }
    const current = document.activeElement;
    const index = current instanceof HTMLElement ? focusable.indexOf(current) : -1;
    if (event.shiftKey && (index <= 0 || !popover.contains(current))) {
      event.preventDefault();
      focusable.at(-1)?.focus();
    } else if (!event.shiftKey && (index === focusable.length - 1 || !popover.contains(current))) {
      event.preventDefault();
      focusable[0]?.focus();
    }
  }

  private activateFocus(step: ActiveStep<T>, target: HTMLElement, direction: TourDirection) {
    const popover = this.popover?.getElement();
    if (!(popover instanceof HTMLElement)) return;
    this.focusGuard.activate({
      allowedTarget: target,
      allowTargetInteraction: step.behavior?.allowInteraction === true,
      autoFocus: step.popover?.disableAutoFocus !== true,
      direction: direction === "advance" ? "next" : "back",
      popover,
    });
  }

  private syncShortcutLabels(step: ActiveStep<T>) {
    const next = this.findTrigger("next");
    const back = this.findTrigger("back");
    syncKeyShortcuts(next, step.popover?.keyboardShortcuts?.next ?? DEFAULT_SHORTCUTS.next);
    syncKeyShortcuts(back, step.popover?.keyboardShortcuts?.back ?? DEFAULT_SHORTCUTS.back);
  }

  private attachButtonHandlers(step: ActiveStep<T>) {
    const next = this.findTrigger("next");
    const back = this.findTrigger("back");
    if (next) {
      this.listen(next, "click", (event) => {
        if (step.props.get().disableNextButton === true) return;
        event.preventDefault();
        void this.command("advance");
      });
    }
    if (back) {
      this.listen(back, "click", (event) => {
        if (step.props.get().disableBackButton === true) return;
        event.preventDefault();
        void this.command("previous");
      });
    }
  }

  private syncControlState(step: ActiveStep<T>) {
    const next = this.findTrigger("next");
    const back = this.findTrigger("back");
    if (next) next.disabled = step.props.get().disableNextButton === true;
    if (back) back.disabled = step.props.get().disableBackButton === true;
  }

  private findTrigger(direction: "next" | "back") {
    const scope = this.root ?? this.popover?.getElement();
    return scope?.querySelector<HTMLButtonElement>(`[data-glow-tour-${direction}-trigger]`) ?? null;
  }

  private async command(command: "advance" | "previous" | "cancel") {
    if (this.disposed) return;
    await this.commands?.[command]();
  }

  private isPointerEnabled(step: ActiveStep<T>) {
    return step.behavior?.allowInteraction === true && step.indicator?.disabled !== true;
  }

  private cleanupStepResources() {
    this.scrollAbort?.abort();
    this.scrollAbort = null;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    for (const cleanup of this.stepCleanups.splice(0)) cleanup();
  }

  private async scrollTargetIntoView(
    step: ActiveStep<T>,
    target: HTMLElement,
    signal: AbortSignal,
  ) {
    if (step.props.get().disableAutoScroll || isInViewport(target.getBoundingClientRect())) return;
    const controller = new AbortController();
    this.scrollAbort = controller;
    await new Promise<void>((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const abort = () => finish(abortError());
      const finish = (error?: Error) => {
        window.removeEventListener("scrollend", complete);
        signal.removeEventListener("abort", abort);
        controller.signal.removeEventListener("abort", abort);
        if (timeout !== null) clearTimeout(timeout);
        if (this.scrollAbort === controller) this.scrollAbort = null;
        if (error) reject(error);
        else resolve();
      };
      const complete = () => finish();
      window.addEventListener("scrollend", complete, { once: true });
      signal.addEventListener("abort", abort, { once: true });
      controller.signal.addEventListener("abort", abort, { once: true });
      timeout = setTimeout(complete, DEFAULT_SCROLL_END_TIMEOUT);
      try {
        target.scrollIntoView({
          behavior: step.scroll?.behavior ?? "smooth",
          block: step.scroll?.block ?? "center",
          inline: step.scroll?.inline ?? "nearest",
        });
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private throwIfAborted(signal: AbortSignal) {
    if (signal.aborted || this.disposed) throw abortError();
  }
}

function animationOptions(
  options: { animated?: boolean; animation?: { duration?: number; easing?: string } } | undefined,
) {
  return {
    disabled: options?.animated === false,
    duration: options?.animation?.duration,
    easing: options?.animation?.easing,
  };
}

function abortError() {
  return new DOMException("The operation was aborted", "AbortError");
}

function copyRect(rect: DOMRect): DOMRect {
  return { ...rect } as DOMRect;
}

function rectEqual(left: DOMRect | null, right: DOMRect | null) {
  return (
    !!left &&
    !!right &&
    left.left === right.left &&
    left.top === right.top &&
    left.width === right.width &&
    left.height === right.height
  );
}

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches(
    "input, textarea, select, [contenteditable]:not([contenteditable='false'])",
  );
}

function isFocusable(element: HTMLElement) {
  return (
    !element.hasAttribute("disabled") &&
    !element.hasAttribute("hidden") &&
    element.getAttribute("aria-hidden") !== "true"
  );
}

function syncKeyShortcuts(element: HTMLButtonElement | null, shortcuts: readonly string[]) {
  if (!element) return;
  if (shortcuts.length === 0) element.removeAttribute("aria-keyshortcuts");
  else element.setAttribute("aria-keyshortcuts", shortcuts.join(" "));
}
