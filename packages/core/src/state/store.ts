import { Observable } from "@glowhop/observables";
import OverlayElement from "../elements/overlay";
import PointerElement from "../elements/pointer";
import PopoverElement from "../elements/popover";
import type { WorkflowStep } from "../engine/workflow-step";
import type {
  BaseOptions,
  EventHandler,
  GlowTourElementName,
  StepActionInstruction,
  StepTransitionAction,
  WorkflowDefinition,
  WorkflowDirection,
  WorkflowState,
  WorkflowStatus,
} from "../types";
import { isInViewport } from "../utils/utils";
import { FocusGuard } from "./focus-guard";

const DEFAULT_TARGET_TIMEOUT = 3000;
const SCROLL_END_TIMEOUT = 1000;

function wait(timeMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, timeMs);
  });
}

type ListenerCleanup = () => void;

export class TourStore<T> {
  // readonly state = this;
  readonly status = new Observable<WorkflowStatus>("not-started");

  readonly currentStepIndex = new Observable(-1);

  readonly direction = new Observable<WorkflowDirection>("next");

  readonly snapshot: Observable<WorkflowState<T>>;

  workflow: WorkflowDefinition<T> | null = null;
  error: Error | null = null;

  readonly steps: WorkflowStep<T>[] = [];
  private listenerCleanups: ListenerCleanup[] = [];
  private popoverListenerCleanups: ListenerCleanup[] = [];
  private positionListenerCleanups: ListenerCleanup[] = [];
  // private readonly elements = new Map<GlowTourElementName, Element>();
  private readonly elementListenerCleanups = new Map<GlowTourElementName, ListenerCleanup>();
  private readonly focusGuard = new FocusGuard();

  private overlay: OverlayElement<T> | null = null;
  private popover: PopoverElement<T> | null = null;
  private pointer: PointerElement<T> | null = null;

  constructor(workflow?: WorkflowDefinition<T>) {
    if (workflow) {
      this._setWorkflow(workflow);
    }
    this.snapshot = new Observable<WorkflowState<T>>(this._createSnapshot());
  }

  get() {
    return this.snapshot.get();
  }

  subscribe(listener: (state: WorkflowState<T>) => void) {
    return this.snapshot.subscribe(listener);
  }

  registerElementOverlay(element: SVGSVGElement | null) {
    if (element) {
      this.overlay = new OverlayElement<T>(element);
    } else {
      this.overlay = null;
    }

    this._syncOverlayStates();
  }

  registerElementPopover(element: HTMLElement | null) {
    if (element) {
      this.popover = new PopoverElement(element);
    } else {
      this.popover = null;
    }

    this._syncPopoverStates();
  }

  registerElementPointer(element: HTMLElement | null) {
    void this.pointer?.disappear();
    this.pointer = element ? new PointerElement<T>(element) : null;
    this.pointer?.initializeProps();
    this._syncPointerStates();

    const step = this._getCurrentWorkflowStep();
    const target = step?.getElement();
    if (step && target && this.status.get() === "idle") {
      void this._movePointer(target.getBoundingClientRect(), step, true);
    }
  }

  async start(workflow = this.workflow) {
    if (!workflow) {
      throw new Error("Cannot start a tour without a workflow");
    }

    this._setWorkflow(workflow);
    this.error = null;
    this._setStatus("starting");

    workflow.options.onStart?.();

    if (this.steps.length === 0) {
      this.focusGuard.deactivate();
      this._setStatus("finished");
      workflow.options.onFinish?.();
      return;
    }

    await this.goTo(0, "next");
  }

  async next() {
    const step = this._getCurrentWorkflowStep();
    if (!step) {
      return;
    }

    if (step.nextAction) {
      this._runTransitionAction(step.nextAction);
    }

    const nextIndex = this.currentStepIndex.get() + 1;
    const isFinished = nextIndex >= this.steps.length;

    if (isFinished) {
      this._detachListeners();
      this.focusGuard.deactivate();
      this._setStatus("finished");
      this.workflow?.options.onFinish?.();
      await this._disappearElements();
      return;
    }

    await this.goTo(nextIndex, "next");
  }

  async back() {
    const step = this._getCurrentWorkflowStep();
    if (!step) {
      return;
    }

    if (step.backAction) {
      this._runTransitionAction(step.backAction);
    }

    const backIndex = this.currentStepIndex.get() - 1;
    if (backIndex < 0) {
      await this.cancel();
      return;
    }

    await this.goTo(backIndex, "back");
  }

  async cancel() {
    if (!this._isCancellable()) {
      return;
    }

    const step = this._getCurrentWorkflowStep();
    if (step?.cancelAction) {
      this._runTransitionAction(step.cancelAction);
    }

    this._detachListeners();
    this.focusGuard.deactivate();
    this._setStatus("cancelled");
    this.workflow?.options.onCancel?.();
    await this._disappearElements();
  }

  private async _scrollToTargetIfNeeded(
    target: HTMLElement,
    targetPosition: DOMRect,
    step: WorkflowStep<T>,
  ) {
    if (step.props.get().disableAutoScroll) {
      return;
    }

    const isIn = isInViewport(targetPosition);

    if (isIn) {
      return;
    }

    const behavior = step.scroll?.behavior ?? this.workflow?.options.scroll?.behavior ?? "smooth";
    const block = step.scroll?.block ?? this.workflow?.options.scroll?.block ?? "center";
    const inline = step.scroll?.inline ?? this.workflow?.options.scroll?.inline ?? "nearest";

    await new Promise<void>((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout>;
      const cleanup = () => {
        window.removeEventListener("scrollend", complete);
        clearTimeout(timeout);
      };
      const complete = () => {
        cleanup();
        resolve();
      };
      window.addEventListener("scrollend", complete, { once: true });
      timeout = setTimeout(complete, SCROLL_END_TIMEOUT);

      try {
        target.scrollIntoView({ behavior, block, inline });
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  }

  private async _disappearElements() {
    !this.overlay && console.warn("No overlay element registered");
    !this.popover && console.warn("No popover element registered");

    const disappearances: Promise<void>[] = [];
    if (this.overlay) disappearances.push(this.overlay.disappear());
    if (this.popover) disappearances.push(this.popover.disappear());
    if (this.pointer) disappearances.push(this.pointer.disappear());
    await Promise.allSettled(disappearances);
  }

  private async _movePopover(targetPosition: DOMRect, step: WorkflowStep<T>, appear: boolean) {
    const popover = this.popover;
    if (!popover) {
      console.warn("No popover element registered");
      return;
    }

    await popover.moveToTarget(targetPosition, step, appear, () => {
      this.snapshot.set(this._createSnapshot());
    });
  }

  private async _moveOverlay(targetPosition: DOMRect, step: WorkflowStep<T>) {
    const overlay = this.overlay;
    if (!overlay) {
      console.warn("No overlay element registered");
      return;
    }

    await overlay.moveToTarget(targetPosition, step);
  }

  private async _movePointer(
    targetPosition: DOMRect,
    step: WorkflowStep<T>,
    appear: boolean,
    popoverPlacement = this.popover?.resolvePosition(targetPosition, step).placement,
  ) {
    if (!this.pointer) {
      return;
    }

    if (!this._isPointerEnabled(step)) {
      await this.pointer.disappear();
      return;
    }

    await this.pointer.moveToTarget(targetPosition, step, appear, popoverPlacement);
  }

  async goTo(index: number, direction: WorkflowDirection = "next") {
    if (index < 0 || index >= this.steps.length) {
      throw new Error(`Step index ${index} is out of bounds`);
    }

    this._detachListeners();
    this.direction.set(direction);

    const step = this.steps[index];

    if (step.initialProps.resetPropsOnEnter !== false) {
      step.reset();
    }

    const target = await this._resolveTargetForStep(step, index);
    if (!target) {
      return;
    }
    await this._scrollToTargetIfNeeded(target, target.getBoundingClientRect(), step);
    this.currentStepIndex.set(index);
    this._setStatus("running");

    const targetPosition = target.getBoundingClientRect();
    const popoverPlacement = this.popover?.resolvePosition(targetPosition, step).placement;
    const appear = index === 0 && direction === "next";

    await Promise.allSettled([
      this._movePopover(targetPosition, step, appear),
      this._moveOverlay(targetPosition, step),
      this._movePointer(targetPosition, step, appear, popoverPlacement),
    ]);

    this._setStatus("idle");
    this._syncFocusGuard(target, step);
    this._attachListeners(step);

    if (step.actions) {
      await this._runActions(step.actions);
    }
  }

  destroy() {
    this._detachListeners();
    this._detachElementListeners();
    this._clearPositionListeners();
    void this.pointer?.disappear();
    void this.popover?.disappear();
    void this.overlay?.disappear();
    this.focusGuard.deactivate();
  }

  private _setWorkflow(workflow: WorkflowDefinition<T>) {
    this.workflow = workflow;
    this.steps.splice(0, this.steps.length, ...workflow.steps.map((step) => step.clone()));
    this.currentStepIndex.set(-1);
    this._syncDerivedState();
  }

  private async _resolveTargetForStep(
    step: WorkflowStep<T>,
    index: number,
  ): Promise<HTMLElement | null> {
    await step.resolveTargetElement();
    const element = step.getElement();
    if (element) {
      return element;
    }
    const strategy =
      step.behavior?.missingTargetStrategy ??
      this.workflow?.options.behavior?.missingTargetStrategy ??
      "error";
    if (strategy === "skip") {
      const nextIndex = index + 1;
      if (nextIndex >= this.steps.length) {
        this._detachListeners();
        this.focusGuard.deactivate();
        this._setStatus("finished");
        this.workflow?.options.onFinish?.();
        await this._disappearElements();
      } else {
        await this.goTo(nextIndex, "next");
      }
      return null;
    }

    if (strategy === "wait") {
      const timeout =
        step.behavior?.targetTimeout ??
        this.workflow?.options.behavior?.targetTimeout ??
        DEFAULT_TARGET_TIMEOUT;
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeout) {
        await wait(16);
        await step.resolveTargetElement();
        const nextElement = step.getElement();
        if (nextElement) {
          return nextElement;
        }
      }
    }

    this.error = new Error(`Missing target: ${step.target}`);
    this.focusGuard.deactivate();
    this._setStatus("error");
    return null;
  }

  private _setStatus(status: WorkflowStatus) {
    this.status.set(status);
    this._syncDerivedState();
  }

  private _syncDerivedState() {
    this._syncPopoverStates();
    this._syncOverlayStates();
    this._syncPointerStates();
    this._syncPositionTracking();
  }

  private _createSnapshot(): WorkflowState<T> {
    return {
      name: this.workflow?.name ?? "",
      totalSteps: this.steps.length,
      startOptions: this.workflow?.options ?? {},
      currentStep: this._getCurrentWorkflowStep()?.getPublicProps() || null,
      currentStepIndex: this.currentStepIndex.get(),
      direction: this.direction.get(),
      status: this.status.get(),
      error: this.error,
      canCancel: this._isCancellable(),
      canGoNext: this._canGoNext(),
      canGoBack: this._canGoBack(),
      isFirstStep: this._isFirstStep(),
      isLastStep: this._isLastStep(),
    };
  }

  private _getCurrentWorkflowStep() {
    const index = this.currentStepIndex.get();
    return index >= 0 ? (this.steps[index] ?? null) : null;
  }

  private _isCancellable() {
    return this.workflow?.options.cancellable ?? true;
  }

  private _isFirstStep() {
    return this.currentStepIndex.get() === 0;
  }

  private _isLastStep() {
    return this.currentStepIndex.get() === this.steps.length - 1;
  }

  private _canGoNext() {
    return this.currentStepIndex.get() <= this.steps.length - 1;
  }

  private _canGoBack() {
    return this.currentStepIndex.get() > 0;
  }

  private _runTransitionAction(action: StepTransitionAction<T> | null) {
    if (!action) {
      return;
    }

    const step = this._getCurrentWorkflowStep();

    if (!step) {
      console.warn("No current step found for transition action");
      return;
    }
    action(step.getElement(), step.props);
  }

  private _syncFocusGuard(target: HTMLElement, step: WorkflowStep<T>) {
    const popover = this.popover?.getElement();
    if (!(popover instanceof HTMLElement)) {
      console.warn("No popover element registered");
      return;
    }

    const allowTargetInteraction =
      step.behavior?.allowInteraction ?? this.workflow?.options.behavior?.allowInteraction ?? false;

    this.focusGuard.activate({
      popover,
      allowedTarget: target,
      allowTargetInteraction,
      autoFocus:
        (step.popover?.disableAutoFocus ?? this.workflow?.options.popover?.disableAutoFocus) !==
        true,
    });
  }

  private _attachListeners(step: WorkflowStep<T>) {
    if (step.eventHandlers) {
      //! update on resize, scroll, etc
      this.listenerCleanups = step.eventHandlers.map((handler) =>
        this._attachListener(step, handler),
      );
    }

    this._attachKeyboardShortcuts(step);
  }

  private _attachKeyboardShortcuts(step: WorkflowStep<T>) {
    const nextKeyshortcuts = step.popover?.keyboardShortcuts?.next ??
      this.workflow?.options.popover?.keyboardShortcuts?.next ?? ["Enter", "ArrowRight"];
    const backKeyshortcuts = step.popover?.keyboardShortcuts?.back ??
      this.workflow?.options.popover?.keyboardShortcuts?.back ?? ["ArrowLeft", "Backspace"];
    const cancelKeyshortcuts = step.popover?.keyboardShortcuts?.cancel ??
      this.workflow?.options.popover?.keyboardShortcuts?.cancel ?? ["Escape"];

    const nextKeyshortcutsStr = nextKeyshortcuts.join(" ");
    const backKeyshortcutsStr = backKeyshortcuts.join(" ");

    const nextButton = document.querySelector<HTMLButtonElement>("[data-glow-tour-next-trigger]");
    if (nextButton) {
      if (nextKeyshortcutsStr) {
        nextButton.setAttribute("aria-keyshortcuts", nextKeyshortcutsStr);
      } else {
        nextButton.removeAttribute("aria-keyshortcuts");
      }
    }
    const backButton = document.querySelector<HTMLButtonElement>("[data-glow-tour-back-trigger]");
    if (backButton) {
      if (backKeyshortcutsStr) {
        backButton.setAttribute("aria-keyshortcuts", backKeyshortcutsStr);
      } else {
        backButton.removeAttribute("aria-keyshortcuts");
      }
    }

    const keydownHandler: EventHandler<T, KeyboardEvent> = {
      event: "keydown",
      callback: async (event) => {
        if (nextKeyshortcuts.includes(event.key) && this._canGoNext()) {
          event.preventDefault();
          nextButton?.focus();
          await this.next();
        } else if (backKeyshortcuts.includes(event.key) && this._canGoBack()) {
          event.preventDefault();
          backButton?.focus();
          await this.back();
        } else if (cancelKeyshortcuts.includes(event.key) && this._isCancellable()) {
          event.preventDefault();
          await this.cancel();
        }
      },
    };

    window.addEventListener(keydownHandler.event, keydownHandler.callback as EventListener);

    this.listenerCleanups.push(() =>
      window.removeEventListener(keydownHandler.event, keydownHandler.callback as EventListener),
    );
  }

  private _detachElementListeners() {
    for (const cleanup of this.elementListenerCleanups.values()) {
      cleanup();
    }
    this.elementListenerCleanups.clear();
  }

  private _isRunning() {
    const status = this.status.get();
    return (
      status !== "not-started" &&
      status !== "finished" &&
      status !== "cancelled" &&
      status !== "error"
    );
  }

  private _getAnimationOptions(options?: BaseOptions, defaults?: BaseOptions) {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animated =
      options?.animated ??
      defaults?.animated ??
      this.workflow?.options.animated ??
      !prefersReducedMotion;

    return {
      duration: options?.animation?.duration ?? defaults?.animation?.duration,
      easing: options?.animation?.easing ?? defaults?.animation?.easing,
      disabled: !animated,
    };
  }

  private _syncPopoverStates() {
    for (const cleanup of this.popoverListenerCleanups) {
      cleanup();
    }
    this.popoverListenerCleanups = [];

    const state = this._createSnapshot();
    if (!this.popover) {
      console.warn("No popover element registered");
      return;
    }

    const popover = this.popover.getElement();
    if (!popover) {
      !popover && console.warn("No popover element found");
      return;
    }

    const isRunning = this._isRunning();
    const step = this._getCurrentWorkflowStep();
    const animationOptions = this._getAnimationOptions(
      step?.popover,
      this.workflow?.options.popover,
    );
    const animated = !animationOptions.disabled;

    if (!isRunning) {
      this.popover.initializeProps();
    }
    popover.setAttribute("data-glow-tour-status", state.status);
    popover.setAttribute("data-glow-tour-step-index", String(state.currentStepIndex));
    popover.setAttribute("data-glow-tour-animated", String(animated));
    popover.setAttribute("data-glow-tour-direction", state.direction);
    popover.setAttribute("data-glow-tour-last-step", String(state.isLastStep));

    this.popover.setAnimationOptions(animationOptions);

    const isIdle = this.status.get() === "idle";
    if (isIdle) {
      const update = async () => {
        if (!this.popover) return;
        const step = this._getCurrentWorkflowStep();
        if (!step) return;
        const index = this.currentStepIndex.get();
        const target = await this._resolveTargetForStep(step, index);
        if (!target) return;
        this.popover.updatePosition(target.getBoundingClientRect(), step);
      };
      const timeout = setInterval(update, 500);
      this.popoverListenerCleanups.push(() => {
        clearInterval(timeout);
      });
    }
  }

  private _syncOverlayStates() {
    const state = this._createSnapshot();
    const isRunning = this._isRunning();
    const step = this._getCurrentWorkflowStep();
    const animationOptions = this._getAnimationOptions(
      step?.overlay,
      this.workflow?.options.overlay,
    );
    const animated = !animationOptions.disabled;
    const allowInteraction =
      isRunning &&
      (step?.behavior?.allowInteraction ??
        this.workflow?.options.behavior?.allowInteraction ??
        false);

    const overlay = this.overlay?.getElement();
    if (!overlay) {
      console.warn("No overlay element registered");
    } else {
      if (!isRunning) {
        this.overlay?.initializeProps();
      }

      overlay.setAttribute("data-glow-tour-direction", state.direction);
      overlay.setAttribute("data-glow-tour-status", state.status);
      overlay.setAttribute("data-glow-tour-step-index", String(state.currentStepIndex));
      overlay.setAttribute("data-glow-tour-animated", String(animated));
      if (isRunning) {
        this.overlay?.setInteractionAllowed(allowInteraction);
      }
      this.overlay?.setAnimationOptions(animationOptions);
    }
  }

  private _syncPointerStates() {
    if (!this.pointer) {
      return;
    }

    const step = this._getCurrentWorkflowStep();
    const animationOptions = this._getAnimationOptions(
      step?.indicateur,
      this.workflow?.options.indicateur,
    );
    this.pointer.setAnimationOptions(animationOptions);
    this.pointer
      .getElement()
      ?.setAttribute("data-glow-tour-animated", String(!animationOptions.disabled));
    if (step && this._isRunning() && !this._isPointerEnabled(step)) {
      void this.pointer.disappear();
    }
  }

  private _isPointerEnabled(step: WorkflowStep<T>) {
    const allowInteraction =
      step.behavior?.allowInteraction ?? this.workflow?.options.behavior?.allowInteraction ?? false;
    const disabled =
      step.indicateur?.disabled ?? this.workflow?.options.indicateur?.disabled ?? false;

    return allowInteraction && !disabled;
  }

  private _syncPositionTracking() {
    this._clearPositionListeners();
    if (this.status.get() !== "idle") return;

    let stopped = false;
    const update = async () => {
      if (stopped) return;
      const step = this._getCurrentWorkflowStep();
      if (!step) return;
      const index = this.currentStepIndex.get();
      const target = await this._resolveTargetForStep(step, index);
      if (!target) return;
      const targetPosition = target.getBoundingClientRect();
      this.overlay?.updatePosition(targetPosition, step);
      if (this.pointer && this._isPointerEnabled(step)) {
        const popoverPlacement = this.popover?.resolvePosition(targetPosition, step).placement;
        this.pointer.updatePosition(targetPosition, step, popoverPlacement);
      }
      requestAnimationFrame(update);
    };

    requestAnimationFrame(update);
    this.positionListenerCleanups.push(() => {
      stopped = true;
    });
  }

  private _clearPositionListeners() {
    for (const cleanup of this.positionListenerCleanups) {
      cleanup();
    }
    this.positionListenerCleanups = [];
  }

  private _attachListener(step: WorkflowStep<T>, handler: EventHandler<T>) {
    const target = step.getElement() ?? document;
    const listener: EventListener = async (event) => {
      await handler.callback(
        event,
        step.props,
        () => this.next(),
        () => this.back(),
        () => this.cancel(),
      );
    };

    target.addEventListener(handler.event, listener);
    return () => {
      target.removeEventListener(handler.event, listener);
    };
  }

  private _detachListeners() {
    for (const cleanup of this.listenerCleanups) {
      cleanup();
    }
    this.listenerCleanups = [];
  }

  private async _runActions(actions: StepActionInstruction<T>[]) {
    for (const action of actions) {
      const activeStep = this._getCurrentWorkflowStep();
      if (!activeStep) {
        return;
      }

      if (typeof action === "number") {
        await wait(action);
        continue;
      }

      if (action === "next") {
        await this.next();
        return;
      }

      if (action === "back") {
        await this.back();
        return;
      }

      const result = await action(activeStep.getElement(), activeStep.props);
      if (result === false) {
        return;
      }
    }
  }
}

export function createTourStore<T>(workflow?: WorkflowDefinition<T>) {
  return new TourStore(workflow);
}
