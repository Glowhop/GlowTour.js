import OverlayElement from "../elements/overlay";
import PointerElement from "../elements/pointer";
import PopoverElement from "../elements/popover";
import type { ActiveStep } from "../runtime/active-step";
import { FocusGuard } from "../state/focus-guard";
import { focusableElementsOwnedBy } from "../state/focusable";
import type { TourDirection } from "../types";
import { isElement, isHTMLElement, isInViewport, ownerWindow } from "../utils/utils";

const DEFAULT_SCROLL_END_TIMEOUT = 1000;
const ACTIVE_MODAL_BY_DOCUMENT = new WeakMap<Document, object>();
const DEFAULT_SHORTCUTS = {
  previous: ["ArrowLeft", "Backspace"],
  cancel: ["Escape"],
  advance: ["Enter", "ArrowRight"],
} as const;

type TourViewCommand = "advance" | "previous" | "cancel";

interface InertBranch {
  readonly element: HTMLElement;
  readonly previous: string | null;
}

export interface TourViewCommands {
  advance(): Promise<void>;
  canAdvance(): boolean;
  canCancel(): boolean;
  canPrevious(): boolean;
  isAdvanceDisabled(): boolean;
  isCancelDisabled(): boolean;
  isPreviousDisabled(): boolean;
  previous(): Promise<void>;
  cancel(): Promise<void>;
  reportError(error: unknown): Promise<void>;
  targetDisconnected(target: HTMLElement): Promise<void>;
  subscribeCapabilities?(listener: (active: boolean) => void): () => void;
}

export interface TourViewDriver<T> {
  show(
    step: ActiveStep<T>,
    direction: TourDirection,
    signal: AbortSignal,
    onBeforePopoverAppear?: () => void | Promise<void>,
  ): Promise<void> | void;
  clear(signal: AbortSignal): Promise<void> | void;
  dispose(): void;
  releaseMount?(): void;
  setCommands?(commands: TourViewCommands): void;
}

export class NoopTourViewDriver<T> implements TourViewDriver<T> {
  show(
    _step: ActiveStep<T>,
    _direction: TourDirection,
    _signal: AbortSignal,
    onBeforePopoverAppear?: () => void | Promise<void>,
  ) {
    return onBeforePopoverAppear?.();
  }

  clear(_signal: AbortSignal): void {}

  dispose(): void {}

  releaseMount(): void {}
}

export class DomTourViewDriver<T> implements TourViewDriver<T> {
  private readonly focusGuard = new FocusGuard();
  private readonly modalToken = {};
  private readonly stepCleanups: Array<() => void> = [];
  private commands: TourViewCommands | null;
  private direction: TourDirection = "advance";
  private currentStep: ActiveStep<T> | null = null;
  private currentSignal: AbortSignal | null = null;
  private disposed = false;
  private generation = 0;
  private active = false;
  private lastTargetRect: RectSnapshot | null = null;
  private inertBranches: InertBranch[] = [];
  private modalDocument: Document | null = null;
  private modalRoot: HTMLElement | null = null;
  private overlay: OverlayElement<T> | null = null;
  private pendingKeyboardCommand: { command: TourViewCommand; generation: number } | null = null;
  private pointer: PointerElement<T> | null = null;
  private pendingFocusGeneration: number | null = null;
  private popover: PopoverElement<T> | null = null;
  private presentationDirty = false;
  private rafId: number | null = null;
  private rafCancel: ((id: number) => void) | null = null;
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
    if (this.active) this.releaseModality();
    this.root = element;
    this.refreshRegisteredElements();
  }

  registerOverlay(element: SVGSVGElement | null) {
    if (this.disposed) return;
    if (this.overlay?.getElement() === element) return;
    this.overlay?.release();
    this.overlay = element ? new OverlayElement<T>(element) : null;
    this.overlay?.initializeProps();
    this.refreshRegisteredElements();
  }

  registerPopover(element: HTMLElement | null) {
    if (this.disposed) return;
    if (this.popover?.getElement() === element) return;
    if (!element && this.active) {
      this.releaseModality();
      this.focusGuard.deactivate();
    }
    this.popover?.release();
    this.popover = element ? new PopoverElement<T>(element) : null;
    this.popover?.initializeProps();
    if (element) this.refreshRegisteredElements();
  }

  registerPointer(element: HTMLElement | null) {
    if (this.disposed) return;
    if (this.pointer?.getElement() === element) return;
    this.pointer?.release();
    this.pointer = element ? new PointerElement<T>(element) : null;
    this.pointer?.initializeProps();
    this.refreshRegisteredElements();
  }

  async show(
    step: ActiveStep<T>,
    direction: TourDirection,
    signal: AbortSignal,
    onBeforePopoverAppear?: () => void | Promise<void>,
  ): Promise<void> {
    this.throwIfAborted(signal);
    const generation = this.beginGeneration();
    const removeAbort = this.cancelAnimationsOnAbort(signal);
    const replaceVisiblePopover = this.active && onBeforePopoverAppear !== undefined;
    let removeTransitionKeydown = () => {};
    try {
      this.cleanupStepResources();
      this.throwIfStale(generation, signal);
      this.active = false;
      this.currentStep = step;
      this.currentSignal = signal;
      this.direction = direction;
      this.lastTargetRect = null;
      this.presentationDirty = false;
      if (replaceVisiblePopover) {
        const listener = (event: Event) =>
          this.queueTransitionKeydown(event as KeyboardEvent, step, generation);
        const currentWindow = this.getWindow();
        if (typeof currentWindow?.addEventListener === "function") {
          currentWindow.addEventListener("keydown", listener);
          removeTransitionKeydown = () => currentWindow.removeEventListener("keydown", listener);
        }
      }
      const target = step.target;
      if (!target) return;

      this.syncModality(step.behavior?.allowInteraction === true);
      await this.scrollTargetIntoView(step, target, signal);
      this.throwIfStale(generation, signal);
      this.initializeElements(step);
      const targetRect = target.getBoundingClientRect();
      await this.appear(targetRect, step, !replaceVisiblePopover, onBeforePopoverAppear);
      this.throwIfStale(generation, signal);
      this.lastTargetRect = snapshotRect(targetRect);
      this.active = true;
      this.activateFocus(step, target, direction, generation);
      this.throwIfStale(generation, signal);
      removeTransitionKeydown();
      removeTransitionKeydown = () => {};
      this.attachStepResources(step, target, generation, signal);
    } catch (error) {
      if (this.isCurrentGeneration(generation)) this.releaseModality();
      throw error;
    } finally {
      removeTransitionKeydown();
      removeAbort();
    }
  }

  async clear(signal: AbortSignal): Promise<void> {
    if (signal.aborted || this.disposed) this.releaseModality();
    this.throwIfAborted(signal);
    const generation = this.beginGeneration();
    const removeAbort = this.cancelAnimationsOnAbort(signal);
    try {
      this.cleanupStepResources();
      this.releaseModality();
      this.focusGuard.deactivate();
      this.throwIfStale(generation, signal);
      this.active = false;
      this.currentStep = null;
      this.currentSignal = null;
      this.lastTargetRect = null;
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

  releaseMount(): void {
    if (this.disposed) return;
    this.beginGeneration();
    this.cleanupStepResources();
    this.releaseModality();
    this.focusGuard.deactivate();
    this.active = false;
    this.currentStep = null;
    this.currentSignal = null;
    this.overlay?.release();
    this.popover?.release();
    this.pointer?.release();
    this.overlay = null;
    this.popover = null;
    this.pointer = null;
    this.root = null;
  }

  dispose(): void {
    if (this.disposed) return;
    this.releaseMount();
    this.disposed = true;
    this.commands = null;
  }

  private refreshRegisteredElements() {
    if (!this.active || !this.currentStep || !this.lastTargetRect) return;
    const generation = this.beginGeneration();
    this.cleanupStepResources();
    void this.activateRegisteredElements(generation).catch((error) => {
      if (!this.isCurrentGeneration(generation)) return;
      return this.commands?.reportError(error);
    });
  }

  private async activateRegisteredElements(generation: number) {
    const step = this.currentStep;
    const targetRect = this.lastTargetRect;
    const target = step?.target;
    const signal = this.currentSignal;
    if (this.disposed || !step || !target || !targetRect || !signal) return;
    this.initializeElements(step);
    await this.appear(targetRect as DOMRect, step);
    this.throwIfStale(generation);
    this.activateFocus(step, target, this.direction, generation);
    this.throwIfStale(generation);
    this.attachStepResources(step, target, generation, signal);
  }

  private initializeElements(step: ActiveStep<T>) {
    const interactionAllowed = step.behavior?.allowInteraction === true;
    this.overlay?.initializeProps();
    this.overlay?.setAnimationOptions(
      animationOptions(step, step.overlay, this.overlay.getElement()),
    );
    this.overlay?.setInteractionAllowed(interactionAllowed);
    this.popover?.initializeProps();
    this.popover?.setAnimationOptions(
      animationOptions(step, step.popover, this.popover.getElement()),
    );
    const popover = this.popover?.getElement();
    if (isHTMLElement(popover, this.root ?? popover) && !interactionAllowed)
      popover.setAttribute("aria-modal", "true");
    this.pointer?.initializeProps();
    this.pointer?.setAnimationOptions(
      animationOptions(step, step.indicator, this.pointer.getElement()),
    );
  }

  private syncModality(interactionAllowed: boolean) {
    if (interactionAllowed) {
      this.releaseModality();
      return;
    }

    const root = this.root;
    if (!root) return;
    const document = root.ownerDocument;
    const owner = ACTIVE_MODAL_BY_DOCUMENT.get(document);
    if (owner && owner !== this.modalToken) {
      throw new Error("Glow Tour only supports one active modal tour per document");
    }
    ACTIVE_MODAL_BY_DOCUMENT.set(document, this.modalToken);
    this.modalDocument = document;
    if (this.modalRoot === root) return;

    this.restoreInertBranches();
    this.modalRoot = root;
    let branch = root;
    while (branch !== document.body) {
      const parent = branch.parentElement;
      if (!parent) break;
      for (const sibling of Array.from(parent.children)) {
        if (!isHTMLElement(sibling, root) || sibling === branch) continue;
        this.inertBranches.push({ element: sibling, previous: sibling.getAttribute("inert") });
        sibling.setAttribute("inert", "");
      }
      branch = parent;
    }
  }

  private releaseModality() {
    this.popover?.getElement()?.removeAttribute("aria-modal");
    this.restoreInertBranches();
    const document = this.modalDocument;
    if (document && ACTIVE_MODAL_BY_DOCUMENT.get(document) === this.modalToken) {
      ACTIVE_MODAL_BY_DOCUMENT.delete(document);
    }
    this.modalDocument = null;
    this.modalRoot = null;
  }

  private restoreInertBranches() {
    for (const { element, previous } of this.inertBranches.splice(0)) {
      if (element.getAttribute("inert") !== "") continue;
      if (previous === null) element.removeAttribute("inert");
      else element.setAttribute("inert", previous);
    }
  }

  private async appear(
    targetRect: DOMRect,
    step: ActiveStep<T>,
    appearPopover = true,
    onBeforePopoverAppear?: () => void | Promise<void>,
  ) {
    const pointerEnabled = this.isPointerEnabled(step);
    const popoverPlacement = this.popover?.resolvePosition(targetRect, step).placement;
    const commitStep = onBeforePopoverAppear
      ? async () => {
          await onBeforePopoverAppear();
          this.syncControlState(step);
          this.syncShortcutLabels(step);
        }
      : undefined;
    const popoverTransition = this.popover
      ? this.popover.moveToTarget(targetRect, step, appearPopover, commitStep)
      : Promise.resolve(commitStep?.());
    await Promise.all([
      this.overlay?.moveToTarget(targetRect, step) ?? Promise.resolve(),
      popoverTransition,
      pointerEnabled
        ? (this.pointer?.moveToTarget(targetRect, step, true, popoverPlacement) ??
          Promise.resolve())
        : (this.pointer?.disappear() ?? Promise.resolve()),
    ]);
  }

  private attachStepResources(
    step: ActiveStep<T>,
    target: HTMLElement,
    generation: number,
    signal: AbortSignal,
  ) {
    this.stepCleanups.push(
      step.props.subscribe(() => {
        if (!this.isCurrentGeneration(generation)) return;
        this.presentationDirty = true;
      }),
    );
    this.stepCleanups.push(
      this.commands?.subscribeCapabilities?.((active) => {
        if (!this.isCurrentGeneration(generation)) return;
        this.syncControlState(step);
        if (active && this.pendingFocusGeneration === generation) {
          this.pendingFocusGeneration = null;
          this.focusGuard.focus();
        }
        if (active) this.flushPendingKeyboardCommand(step, generation);
      }) ?? (() => {}),
    );
    for (const handler of step.definition.eventHandlers) {
      const listener = (event: Event) => {
        if (!this.isCurrentGeneration(generation)) return;
        const context = Object.freeze({
          advance: () => this.commandForStep("advance", step, signal),
          cancel: () => this.commandForStep("cancel", step, signal),
          previous: () => this.commandForStep("previous", step, signal),
          props: step.props,
          signal,
          target,
        });
        void Promise.resolve()
          .then(() => handler.callback(event, context))
          .catch((error) => {
            if (signal.aborted || this.currentStep !== step) return;
            return this.commands?.reportError(error);
          });
      };
      this.listen(target, handler.event, listener);
    }
    const currentWindow = this.getWindow(target);
    if (typeof currentWindow?.addEventListener === "function") {
      this.listen(currentWindow, "keydown", (event) => {
        if (this.isCurrentGeneration(generation)) this.handleKeydown(event as KeyboardEvent);
      });
    }
    this.attachButtonHandlers(step);
    this.observeControls(step, generation);
    this.syncControlState(step);
    this.syncShortcutLabels(step);
    this.schedulePosition(generation);
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
    const owner = this.currentStep.target?.ownerDocument?.defaultView;
    const ownerRequest = owner?.requestAnimationFrame;
    const ownerCancel = owner?.cancelAnimationFrame;
    const ownerHasFrameCapability =
      typeof ownerRequest === "function" || typeof ownerCancel === "function";
    const request = ownerHasFrameCapability ? ownerRequest : globalThis.requestAnimationFrame;
    const cancel = ownerHasFrameCapability ? ownerCancel : globalThis.cancelAnimationFrame;
    if (typeof request !== "function" || typeof cancel !== "function") return;
    const frameWindow = ownerHasFrameCapability && owner ? owner : globalThis;
    this.rafCancel = (id) => cancel.call(frameWindow, id);
    this.rafId = request.call(frameWindow, () => {
      this.rafId = null;
      this.rafCancel = null;
      if (!this.isCurrentGeneration(generation)) return;
      this.updatePosition(generation);
      this.schedulePosition(generation);
    });
  }

  private updatePosition(generation: number) {
    const step = this.currentStep;
    const target = step?.target;
    if (!this.isCurrentGeneration(generation) || !step || !target) return;
    if (!this.isCurrentTargetAvailable(target)) {
      this.stopForDisconnectedTarget(target, generation);
      return;
    }
    const targetRect = target.getBoundingClientRect();
    const targetSnapshot = snapshotRect(targetRect);
    const presentationChanged = this.presentationDirty;
    if (!presentationChanged && sameRect(targetSnapshot, this.lastTargetRect)) return;
    if (presentationChanged) {
      this.overlay?.setAnimationOptions(
        animationOptions(step, step.overlay, this.overlay.getElement()),
      );
      this.popover?.setAnimationOptions(
        animationOptions(step, step.popover, this.popover.getElement()),
      );
      this.pointer?.setAnimationOptions(
        animationOptions(step, step.indicator, this.pointer.getElement()),
      );
      this.syncControlState(step);
      this.syncShortcutLabels(step);
      console.log(
        "TourViewDriver: presentation changed, updated animation options and synced controls",
      );
    }
    this.overlay?.updatePosition(targetRect, step, presentationChanged, (transition) =>
      this.observeDynamicOperation(transition, generation),
    );
    const popoverPlacement = this.popover?.updatePosition(targetRect, step, (reposition) =>
      this.observeDynamicOperation(reposition, generation),
    );
    if (presentationChanged) {
      this.pointer?.syncVisibility(this.isPointerEnabled(step), targetRect, step, popoverPlacement);
    } else if (this.isPointerEnabled(step)) {
      const pointer = this.pointer?.getElement();
      if (pointer?.getAttribute("aria-hidden") === "true") {
        this.observeDynamicOperation(
          this.pointer?.moveToTarget(targetRect, step, true, popoverPlacement),
          generation,
        );
      } else {
        this.pointer?.updatePosition(targetRect, step, popoverPlacement);
      }
    } else if (this.pointer?.getElement()?.getAttribute("aria-hidden") !== "true") {
      this.observeDynamicOperation(this.pointer?.disappear(), generation);
    }
    this.lastTargetRect = targetSnapshot;
    if (presentationChanged) this.presentationDirty = false;
  }

  private observeDynamicOperation(operation: Promise<void> | undefined, generation: number) {
    if (!operation) return;
    void operation.catch((error) => {
      if (!this.isCurrentGeneration(generation)) return;
      try {
        const reported = this.commands?.reportError(error);
        void reported?.catch(() => {});
      } catch {}
    });
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
    if (isEditable(event.target, this.root)) return;
    if (
      (shortcuts?.advance ?? DEFAULT_SHORTCUTS.advance).includes(event.key) &&
      this.canCommand("advance", step)
    ) {
      event.preventDefault();
      void this.command("advance");
    } else if (
      (shortcuts?.previous ?? DEFAULT_SHORTCUTS.previous).includes(event.key) &&
      this.canCommand("previous", step)
    ) {
      event.preventDefault();
      void this.command("previous");
    }
  }

  private queueTransitionKeydown(event: KeyboardEvent, step: ActiveStep<T>, generation: number) {
    if (
      !this.isCurrentGeneration(generation) ||
      event.defaultPrevented ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    const shortcuts = step.popover?.keyboardShortcuts;
    let command: TourViewCommand | null = null;
    if ((shortcuts?.cancel ?? DEFAULT_SHORTCUTS.cancel).includes(event.key)) command = "cancel";
    else if (!isEditable(event.target, this.root)) {
      if (
        (shortcuts?.advance ?? DEFAULT_SHORTCUTS.advance).includes(event.key) &&
        step.props.get().popover?.disableAdvanceButton !== true
      )
        command = "advance";
      else if (
        (shortcuts?.previous ?? DEFAULT_SHORTCUTS.previous).includes(event.key) &&
        step.props.get().popover?.disablePreviousButton !== true
      )
        command = "previous";
    }
    if (!command) return;
    event.preventDefault();
    this.pendingKeyboardCommand ??= { command, generation };
  }

  private flushPendingKeyboardCommand(step: ActiveStep<T>, generation: number) {
    const pending = this.pendingKeyboardCommand;
    if (!pending || pending.generation !== generation) return;
    this.pendingKeyboardCommand = null;
    queueMicrotask(() => {
      if (
        !this.isCurrentGeneration(generation) ||
        this.currentStep !== step ||
        !this.canCommand(pending.command, step)
      )
        return;
      void this.commandForGeneration(pending.command, generation);
    });
  }

  private loopFocus(event: KeyboardEvent) {
    const popover = this.popover?.getElement();
    if (!isHTMLElement(popover, this.root ?? popover)) return;
    const focusable = focusableElementsOwnedBy(popover);
    if (focusable.length === 0) {
      event.preventDefault();
      popover.focus();
      return;
    }
    const current = popover.ownerDocument.activeElement;
    const index = isHTMLElement(current, popover) ? focusable.indexOf(current) : -1;
    if (event.shiftKey && (index <= 0 || !popover.contains(current))) {
      event.preventDefault();
      focusable.at(-1)?.focus();
    } else if (!event.shiftKey && (index === focusable.length - 1 || !popover.contains(current))) {
      event.preventDefault();
      focusable[0]?.focus();
    }
  }

  private activateFocus(
    step: ActiveStep<T>,
    target: HTMLElement,
    direction: TourDirection,
    generation: number,
  ) {
    const popover = this.popover?.getElement();
    if (!isHTMLElement(popover, this.root ?? popover)) return;
    const autoFocus = step.behavior?.disableAutoFocus !== true;
    const deferFocus = autoFocus && this.commands?.subscribeCapabilities !== undefined;
    if (deferFocus) this.pendingFocusGeneration = generation;
    this.focusGuard.activate({
      allowedTarget: target,
      allowTargetInteraction: step.behavior?.allowInteraction === true,
      autoFocus: autoFocus && !deferFocus,
      direction,
      fallback: this.root ?? popover.parentElement,
      popover,
    });
  }

  private syncShortcutLabels(step: ActiveStep<T>) {
    for (const advance of this.findTriggers("advance")) {
      syncKeyShortcuts(
        advance,
        step.popover?.keyboardShortcuts?.advance ?? DEFAULT_SHORTCUTS.advance,
      );
    }
    for (const previous of this.findTriggers("previous")) {
      syncKeyShortcuts(
        previous,
        step.popover?.keyboardShortcuts?.previous ?? DEFAULT_SHORTCUTS.previous,
      );
    }
  }

  private attachButtonHandlers(step: ActiveStep<T>) {
    const generation = this.generation;
    const scope = this.root ?? this.popover?.getElement();
    if (!isHTMLElement(scope, scope) || typeof scope.addEventListener !== "function") return;
    this.listen(scope, "click", (event) => {
      if (!isElement(event.target, scope)) return;
      const match = this.findClickedTrigger(event.target, scope);
      if (!match) return;
      this.deferTriggerCommand(match.command, event, step, generation, match.trigger);
    });
  }

  private findClickedTrigger(target: Element, scope: HTMLElement) {
    for (const [command, direction] of [
      ["advance", "advance"],
      ["previous", "previous"],
      ["cancel", "cancel"],
    ] as const) {
      const trigger = target.closest<HTMLElement>(`[data-glow-tour-${direction}-trigger]`);
      if (trigger && this.ownsTrigger(trigger, scope)) {
        return { command, trigger: trigger as HTMLButtonElement };
      }
    }
    return null;
  }

  private observeControls(step: ActiveStep<T>, generation: number) {
    const scope = this.root ?? this.popover?.getElement();
    if (!isHTMLElement(scope, scope)) return;
    const MutationObserver = this.getWindow(scope)?.MutationObserver ?? globalThis.MutationObserver;
    if (typeof MutationObserver !== "function") return;
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        if (!this.isCurrentGeneration(generation) || this.currentStep !== step) return;
        this.syncControlState(step);
        this.syncShortcutLabels(step);
      });
    });
    observer.observe(scope, { childList: true, subtree: true });
    this.stepCleanups.push(() => observer.disconnect());
  }

  private deferTriggerCommand(
    command: TourViewCommand,
    event: Event,
    step: ActiveStep<T>,
    generation: number,
    trigger: HTMLButtonElement,
  ) {
    if (
      event.defaultPrevented ||
      this.isLiveDisabled(trigger) ||
      !this.canCommand(command, step, trigger)
    )
      return;
    queueMicrotask(() => {
      if (
        event.defaultPrevented ||
        this.isLiveDisabled(trigger) ||
        !this.isCurrentGeneration(generation) ||
        this.currentStep !== step ||
        !this.canCommand(command, step, trigger)
      )
        return;
      void this.commandForGeneration(command, generation);
    });
  }

  private syncControlState(step: ActiveStep<T>) {
    for (const advance of this.findTriggers("advance")) {
      this.syncControl(
        advance,
        this.commands?.isAdvanceDisabled() === true ||
          step.props.get().popover?.disableAdvanceButton === true,
      );
    }
    for (const previous of this.findTriggers("previous")) {
      this.syncControl(
        previous,
        this.commands?.isPreviousDisabled() === true ||
          step.props.get().popover?.disablePreviousButton === true,
      );
    }
    for (const cancel of this.findTriggers("cancel")) {
      this.syncControl(cancel, this.commands?.isCancelDisabled() === true);
    }
  }

  private findTriggers(direction: TourViewCommand) {
    const scope = this.root ?? this.popover?.getElement();
    if (!isHTMLElement(scope, scope) || typeof scope.querySelectorAll !== "function") return [];
    return Array.from(
      scope.querySelectorAll<HTMLButtonElement>(`[data-glow-tour-${direction}-trigger]`),
    ).filter((trigger) => this.ownsTrigger(trigger, scope));
  }

  private ownsTrigger(trigger: HTMLElement, scope: HTMLElement) {
    if (!scope.contains(trigger)) return false;
    const owner = this.root ?? scope.closest<HTMLElement>("[data-glow-tour-root]");
    return trigger.closest("[data-glow-tour-root]") === owner;
  }

  private async command(command: TourViewCommand) {
    if (this.disposed) return;
    if (command === "advance") await this.commands?.advance();
    else if (command === "previous") await this.commands?.previous();
    else await this.commands?.cancel();
  }

  private commandForGeneration(command: TourViewCommand, generation: number) {
    return this.isCurrentGeneration(generation) ? this.command(command) : Promise.resolve();
  }

  private commandForStep(command: TourViewCommand, step: ActiveStep<T>, signal: AbortSignal) {
    return !signal.aborted && this.currentStep === step ? this.command(command) : Promise.resolve();
  }

  private canCommand(
    command: TourViewCommand,
    step: ActiveStep<T>,
    trigger?: HTMLButtonElement | null,
  ) {
    if (this.isConsumerDisabled(trigger ?? null)) return false;
    if (command === "advance") {
      return (
        (this.commands?.canAdvance?.() ?? true) &&
        step.props.get().popover?.disableAdvanceButton !== true
      );
    }
    if (command === "previous") {
      return (
        (this.commands?.canPrevious?.() ?? true) &&
        step.props.get().popover?.disablePreviousButton !== true
      );
    }
    return this.commands?.canCancel?.() ?? true;
  }

  private syncControl(element: HTMLButtonElement | null, disabled: boolean) {
    if (!element) return;
    if (element.hasAttribute("data-glow-tour-control-managed")) return;
    const isDisabled = disabled || this.isConsumerDisabled(element);
    if (element.disabled !== isDisabled) element.disabled = isDisabled;
    if (element.getAttribute("aria-disabled") !== String(isDisabled)) {
      element.setAttribute("aria-disabled", String(isDisabled));
    }
  }

  private isConsumerDisabled(element: HTMLButtonElement | null) {
    return element?.getAttribute("data-glow-tour-consumer-disabled") === "true";
  }

  private isLiveDisabled(element: HTMLButtonElement) {
    return (
      element.disabled ||
      element.getAttribute("aria-disabled") === "true" ||
      this.isConsumerDisabled(element)
    );
  }

  private isPointerEnabled(step: ActiveStep<T>) {
    return step.behavior?.allowInteraction === true && step.indicator?.disabled !== true;
  }

  private cleanupStepResources() {
    this.scrollAbort?.abort();
    this.scrollAbort = null;
    this.presentationDirty = false;
    if (this.rafId !== null) this.rafCancel?.(this.rafId);
    this.rafId = null;
    this.rafCancel = null;
    for (const cleanup of this.stepCleanups.splice(0)) cleanup();
  }

  private isCurrentTargetAvailable(target: HTMLElement) {
    const rootDocument = this.root?.ownerDocument;
    return target.isConnected && (!rootDocument || target.ownerDocument === rootDocument);
  }

  private stopForDisconnectedTarget(target: HTMLElement, generation: number) {
    if (!this.isCurrentGeneration(generation)) return;
    this.beginGeneration();
    this.cleanupStepResources();
    this.releaseModality();
    this.focusGuard.deactivate();
    this.active = false;
    this.currentSignal = null;
    this.currentStep = null;
    this.lastTargetRect = null;
    void Promise.resolve(this.commands?.targetDisconnected(target)).catch((error) => {
      void this.commands?.reportError(error).catch(() => {});
    });
  }

  private beginGeneration() {
    this.generation += 1;
    this.pendingKeyboardCommand = null;
    this.pendingFocusGeneration = null;
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
    if (step.behavior?.disableAutoScroll || isInViewport(target.getBoundingClientRect(), target))
      return;
    const currentWindow = this.getWindow(target);
    if (!currentWindow) return;
    const controller = new AbortController();
    this.scrollAbort = controller;
    await new Promise<void>((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const abort = () => finish(abortError());
      const finish = (error?: Error) => {
        currentWindow.removeEventListener("scrollend", complete);
        signal.removeEventListener("abort", abort);
        controller.signal.removeEventListener("abort", abort);
        if (timeout !== null) clearTimeout(timeout);
        if (this.scrollAbort === controller) this.scrollAbort = null;
        if (error) reject(error);
        else resolve();
      };
      const complete = () => finish();
      currentWindow.addEventListener("scrollend", complete, { once: true });
      signal.addEventListener("abort", abort, { once: true });
      controller.signal.addEventListener("abort", abort, { once: true });
      timeout = setTimeout(complete, DEFAULT_SCROLL_END_TIMEOUT);
      try {
        target.scrollIntoView({
          behavior: prefersReducedMotion(target)
            ? "instant"
            : (step.behavior?.scroll?.behavior ?? "smooth"),
          block: step.behavior?.scroll?.block ?? "center",
          inline: step.behavior?.scroll?.inline ?? "nearest",
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

  private getWindow(element?: Node | null) {
    return ownerWindow(
      element ??
        this.root ??
        this.popover?.getElement() ??
        this.pointer?.getElement() ??
        this.overlay?.getElement(),
    );
  }
}

function animationOptions(
  step: { readonly animated: boolean | undefined },
  options: { animated?: boolean; animation?: { duration?: number; easing?: string } } | undefined,
  element?: Node | null,
) {
  return {
    disabled:
      step.animated === false || options?.animated === false || prefersReducedMotion(element),
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

function sameRect(left: RectSnapshot, right: RectSnapshot | null) {
  return (
    right !== null &&
    left.bottom === right.bottom &&
    left.height === right.height &&
    left.left === right.left &&
    left.right === right.right &&
    left.top === right.top &&
    left.width === right.width &&
    left.x === right.x &&
    left.y === right.y
  );
}

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function isEditable(target: EventTarget | null, context?: Node | null) {
  if (!isHTMLElement(target, context)) return false;
  if (target.matches("input, textarea, select")) return true;
  let current: HTMLElement | null = target;
  while (current) {
    const contentEditable = current.getAttribute("contenteditable");
    if (contentEditable !== null) return contentEditable.toLowerCase() !== "false";
    current = current.parentElement;
  }
  return false;
}

function prefersReducedMotion(context?: Node | null) {
  const currentWindow = ownerWindow(context);
  return (
    typeof currentWindow?.matchMedia === "function" &&
    currentWindow.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function syncKeyShortcuts(element: HTMLButtonElement | null, shortcuts: readonly string[]) {
  if (!element) return;
  if (shortcuts.length === 0) element.removeAttribute("aria-keyshortcuts");
  else element.setAttribute("aria-keyshortcuts", shortcuts.join(" "));
}
