import OverlayElement from "../elements/overlay";
import PointerElement from "../elements/pointer";
import PopoverElement from "../elements/popover";
import type { ActiveStep } from "../runtime/active-step";
import { FocusGuard } from "../state/focus-guard";
import { focusableElements } from "../state/focusable";
import type { TourDirection } from "../types";
import { isInViewport } from "../utils/utils";

const DEFAULT_SCROLL_END_TIMEOUT = 1000;
const DEFAULT_SHORTCUTS = {
  back: ["ArrowLeft", "Backspace"],
  cancel: ["Escape"],
  next: ["Enter", "ArrowRight"],
} as const;
export interface TourViewCommands {
  advance(): Promise<void>;
  canAdvance(): boolean;
  canCancel(): boolean;
  canPrevious(): boolean;
  previous(): Promise<void>;
  cancel(): Promise<void>;
  subscribeCapabilities?(listener: () => void): () => void;
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
  private direction: TourDirection = "advance";
  private currentStep: ActiveStep<T> | null = null;
  private disposed = false;
  private generation = 0;
  private active = false;
  private lastPopoverRect: RectSnapshot | null = null;
  private lastTargetRect: RectSnapshot | null = null;
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
    if (this.disposed || this.root === element) return;
    this.root = element;
    this.refreshRegisteredElements();
  }

  registerOverlay(element: SVGSVGElement | null) {
    if (this.disposed) return;
    if (this.overlay?.getElement() === element) return;
    this.overlay?.release();
    this.overlay = element ? new OverlayElement<T>(element) : null;
    this.refreshRegisteredElements();
  }

  registerPopover(element: HTMLElement | null) {
    if (this.disposed) return;
    if (this.popover?.getElement() === element) return;
    if (!element && this.active) this.focusGuard.deactivate();
    this.popover?.release();
    this.popover = element ? new PopoverElement<T>(element) : null;
    this.refreshRegisteredElements();
  }

  registerPointer(element: HTMLElement | null) {
    if (this.disposed) return;
    if (this.pointer?.getElement() === element) return;
    this.pointer?.release();
    this.pointer = element ? new PointerElement<T>(element) : null;
    this.refreshRegisteredElements();
  }

  async show(step: ActiveStep<T>, direction: TourDirection, signal: AbortSignal): Promise<void> {
    this.throwIfAborted(signal);
    const generation = this.beginGeneration();
    const removeAbort = this.cancelAnimationsOnAbort(signal);
    try {
      this.cleanupStepResources();
      this.focusGuard.deactivate();
      this.active = false;
      this.currentStep = step;
      this.direction = direction;
      this.lastTargetRect = null;
      this.lastPopoverRect = null;
      const target = step.target;
      if (!target) return;

      await this.scrollTargetIntoView(step, target, signal);
      this.throwIfStale(generation, signal);
      this.initializeElements(step);
      const targetRect = target.getBoundingClientRect();
      await this.appear(targetRect, step);
      this.throwIfStale(generation, signal);
      this.lastTargetRect = snapshotRect(targetRect);
      const popover = this.popover?.getElement();
      this.lastPopoverRect = popover ? snapshotRect(popover.getBoundingClientRect()) : null;
      this.active = true;
      this.activateFocus(step, target, direction);
      this.throwIfStale(generation, signal);
      this.attachStepResources(step, target, generation);
    } finally {
      removeAbort();
    }
  }

  async clear(signal: AbortSignal): Promise<void> {
    this.throwIfAborted(signal);
    const generation = this.beginGeneration();
    const removeAbort = this.cancelAnimationsOnAbort(signal);
    try {
      this.cleanupStepResources();
      this.focusGuard.deactivate();
      this.active = false;
      this.currentStep = null;
      this.lastTargetRect = null;
      this.lastPopoverRect = null;
      this.popover?.getElement()?.removeAttribute("aria-modal");
      await Promise.allSettled([
        this.overlay?.disappear() ?? Promise.resolve(),
        this.popover?.disappear() ?? Promise.resolve(),
        this.pointer?.disappear() ?? Promise.resolve(),
      ]);
      this.throwIfStale(generation, signal);
    } finally {
      removeAbort();
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.beginGeneration();
    this.cleanupStepResources();
    this.focusGuard.deactivate();
    this.active = false;
    this.currentStep = null;
    this.commands = null;
    this.overlay?.release();
    this.popover?.release();
    this.pointer?.release();
    this.overlay = null;
    this.popover = null;
    this.pointer = null;
    this.root = null;
  }

  private refreshRegisteredElements() {
    if (!this.active || !this.currentStep || !this.lastTargetRect) return;
    const generation = this.beginGeneration();
    this.cleanupStepResources();
    void this.activateRegisteredElements(generation).catch(() => {});
  }

  private async activateRegisteredElements(generation: number) {
    const step = this.currentStep;
    const targetRect = this.lastTargetRect;
    const target = step?.target;
    if (this.disposed || !step || !target || !targetRect) return;
    this.initializeElements(step);
    await this.appear(targetRect as DOMRect, step);
    this.throwIfStale(generation);
    const popover = this.popover?.getElement();
    this.lastPopoverRect = popover ? snapshotRect(popover.getBoundingClientRect()) : null;
    this.activateFocus(step, target, this.direction);
    this.throwIfStale(generation);
    this.attachStepResources(step, target, generation);
  }

  private initializeElements(step: ActiveStep<T>) {
    const interactionAllowed = step.behavior?.allowInteraction === true;
    this.overlay?.initializeProps();
    this.overlay?.setAnimationOptions(animationOptions(step, step.overlay));
    this.overlay?.setInteractionAllowed(interactionAllowed);
    this.popover?.initializeProps();
    this.popover?.setAnimationOptions(animationOptions(step, step.popover));
    const popover = this.popover?.getElement();
    if (popover instanceof HTMLElement) {
      if (interactionAllowed) popover.removeAttribute("aria-modal");
      else popover.setAttribute("aria-modal", "true");
    }
    this.pointer?.initializeProps();
    this.pointer?.setAnimationOptions(animationOptions(step, step.indicator));
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

  private attachStepResources(step: ActiveStep<T>, target: HTMLElement, generation: number) {
    const invalidate = () => this.schedulePosition(generation);
    this.listen(window, "resize", invalidate, { passive: true });
    this.listen(window, "scroll", invalidate, { capture: true, passive: true });
    const observer = new ResizeObserver(invalidate);
    observer.observe(target);
    const popover = this.popover?.getElement();
    if (popover) observer.observe(popover);
    this.stepCleanups.push(() => observer.disconnect());
    this.stepCleanups.push(
      step.props.subscribe(() => {
        if (!this.isCurrentGeneration(generation)) return;
        this.syncControlState(step);
        this.syncShortcutLabels(step);
        invalidate();
      }),
    );
    this.stepCleanups.push(
      this.commands?.subscribeCapabilities?.(() => {
        if (!this.isCurrentGeneration(generation)) return;
        this.syncControlState(step);
      }) ?? (() => {}),
    );
    for (const handler of step.definition.eventHandlers) {
      const listener = (event: Event) => {
        if (!this.isCurrentGeneration(generation)) return;
        void handler.callback(
          event,
          step.props,
          () => this.commandForGeneration("advance", generation),
          () => this.commandForGeneration("previous", generation),
          () => this.commandForGeneration("cancel", generation),
        );
      };
      this.listen(target, handler.event, listener);
    }
    this.listen(window, "keydown", (event) => {
      if (this.isCurrentGeneration(generation)) this.handleKeydown(event as KeyboardEvent);
    });
    this.attachButtonHandlers(step);
    this.syncControlState(step);
    this.syncShortcutLabels(step);
    if (step.behavior?.targetTracking === "continuous") this.schedulePosition(generation);
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

  private schedulePosition(generation = this.generation) {
    if (!this.isCurrentGeneration(generation) || !this.currentStep || this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (!this.isCurrentGeneration(generation)) return;
      this.updatePosition(generation);
      if (this.currentStep?.behavior?.targetTracking === "continuous")
        this.schedulePosition(generation);
    });
  }

  private updatePosition(generation: number) {
    const step = this.currentStep;
    const target = step?.target;
    if (!this.isCurrentGeneration(generation) || !step || !target) return;
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
    this.lastTargetRect = snapshotRect(targetRect);
    this.lastPopoverRect = popoverRect ? snapshotRect(popoverRect) : null;
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
    const shortcuts = step.popover?.keyboardShortcuts;
    if (
      (shortcuts?.cancel ?? DEFAULT_SHORTCUTS.cancel).includes(event.key) &&
      this.canCommand("cancel", step)
    ) {
      event.preventDefault();
      void this.command("cancel");
      return;
    }
    if (isEditable(event.target)) return;
    if (
      (shortcuts?.next ?? DEFAULT_SHORTCUTS.next).includes(event.key) &&
      this.canCommand("advance", step)
    ) {
      event.preventDefault();
      void this.command("advance");
    } else if (
      (shortcuts?.back ?? DEFAULT_SHORTCUTS.back).includes(event.key) &&
      this.canCommand("previous", step)
    ) {
      event.preventDefault();
      void this.command("previous");
    }
  }

  private loopFocus(event: KeyboardEvent) {
    const popover = this.popover?.getElement();
    if (!(popover instanceof HTMLElement)) return;
    const focusable = focusableElements(popover);
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
        if (!this.canCommand("advance", step)) return;
        event.preventDefault();
        void this.command("advance");
      });
    }
    if (back) {
      this.listen(back, "click", (event) => {
        if (!this.canCommand("previous", step)) return;
        event.preventDefault();
        void this.command("previous");
      });
    }
    const cancel = this.findTrigger("cancel");
    if (cancel) {
      this.listen(cancel, "click", (event) => {
        if (!this.canCommand("cancel", step)) return;
        event.preventDefault();
        void this.command("cancel");
      });
    }
  }

  private syncControlState(step: ActiveStep<T>) {
    const next = this.findTrigger("next");
    const back = this.findTrigger("back");
    const cancel = this.findTrigger("cancel");
    this.syncControl(next, !this.canCommand("advance", step));
    this.syncControl(back, !this.canCommand("previous", step));
    this.syncControl(cancel, !this.canCommand("cancel", step));
  }

  private findTrigger(direction: "next" | "back" | "cancel") {
    const scope = this.root ?? this.popover?.getElement();
    return scope?.querySelector<HTMLButtonElement>(`[data-glow-tour-${direction}-trigger]`) ?? null;
  }

  private async command(command: "advance" | "previous" | "cancel") {
    if (this.disposed) return;
    await this.commands?.[command]();
  }

  private commandForGeneration(command: "advance" | "previous" | "cancel", generation: number) {
    return this.isCurrentGeneration(generation) ? this.command(command) : Promise.resolve();
  }

  private canCommand(command: "advance" | "previous" | "cancel", step: ActiveStep<T>) {
    if (command === "advance") {
      return (this.commands?.canAdvance?.() ?? true) && step.props.get().disableNextButton !== true;
    }
    if (command === "previous") {
      return (
        (this.commands?.canPrevious?.() ?? true) && step.props.get().disableBackButton !== true
      );
    }
    return this.commands?.canCancel?.() ?? true;
  }

  private syncControl(element: HTMLButtonElement | null, disabled: boolean) {
    if (!element) return;
    element.disabled = disabled;
    element.setAttribute("aria-disabled", String(disabled));
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

  private beginGeneration() {
    this.generation += 1;
    this.cancelElementAnimations();
    return this.generation;
  }

  private cancelAnimationsOnAbort(signal: AbortSignal) {
    const onAbort = () => this.cancelElementAnimations();
    signal.addEventListener("abort", onAbort, { once: true });
    return () => signal.removeEventListener("abort", onAbort);
  }

  private cancelElementAnimations() {
    this.overlay?.cancelAnimations();
    this.popover?.cancelAnimations();
    this.pointer?.cancelAnimations();
  }

  private isCurrentGeneration(generation: number) {
    return !this.disposed && generation === this.generation;
  }

  private async scrollTargetIntoView(
    step: ActiveStep<T>,
    target: HTMLElement,
    signal: AbortSignal,
  ) {
    this.throwIfAborted(signal);
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

  private throwIfStale(generation: number, signal?: AbortSignal) {
    if (!this.isCurrentGeneration(generation) || signal?.aborted) throw abortError();
  }
}

function animationOptions(
  step: { readonly animated: boolean | undefined },
  options: { animated?: boolean; animation?: { duration?: number; easing?: string } } | undefined,
) {
  return {
    disabled: step.animated === false || options?.animated === false || prefersReducedMotion(),
    duration: options?.animation?.duration,
    easing: options?.animation?.easing,
  };
}

function abortError() {
  return new DOMException("The operation was aborted", "AbortError");
}

interface RectSnapshot {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
  x: number;
  y: number;
}

function snapshotRect(rect: DOMRect): RectSnapshot {
  const left = finite(rect.left);
  const top = finite(rect.top);
  const width = finite(rect.width);
  const height = finite(rect.height);
  return {
    bottom: finite(rect.bottom, top + height),
    height,
    left,
    right: finite(rect.right, left + width),
    top,
    width,
    x: finite(rect.x, left),
    y: finite(rect.y, top),
  };
}

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function rectEqual(left: DOMRect | null, right: RectSnapshot | null) {
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
  if (target.matches("input, textarea, select")) return true;
  let current: HTMLElement | null = target;
  while (current) {
    const contentEditable = current.getAttribute("contenteditable");
    if (contentEditable !== null) return contentEditable.toLowerCase() !== "false";
    current = current.parentElement;
  }
  return false;
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function syncKeyShortcuts(element: HTMLButtonElement | null, shortcuts: readonly string[]) {
  if (!element) return;
  if (shortcuts.length === 0) element.removeAttribute("aria-keyshortcuts");
  else element.setAttribute("aria-keyshortcuts", shortcuts.join(" "));
}
