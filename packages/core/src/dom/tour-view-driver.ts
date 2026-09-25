import type { TourElementStep } from "../elements/base";
import OverlayElement from "../elements/overlay";
import PointerElement from "../elements/pointer";
import PopoverElement from "../elements/popover";
import type { ActiveStep } from "../runtime/active-step";
import { FocusGuard } from "../state/focus-guard";
import { FOCUSABLE_SELECTOR, focusableElementsOwnedBy } from "../state/focusable";
import { ScrollLock } from "../state/scroll-lock";
import type { ResolvedPlacement, TourDirection, TourEventSource } from "../types";
import { isControlAvailable } from "../utils/options";
import {
  isElement,
  isHTMLElement,
  isInViewport,
  ownerDocument,
  ownerWindow,
  viewportDimensions,
} from "../utils/utils";

/** Frames the scroller must hold still before the scroll counts as settled. */
const SCROLL_SETTLE_STILL_FRAMES = 2;
/** Frames of grace before stillness counts, since a smooth scroll does not
 * move on the frame it was asked for. */
const SCROLL_SETTLE_GRACE_FRAMES = 3;
/** Offset change, in pixels, small enough to count as "not moving". */
const SCROLL_SETTLE_EPSILON = 0.5;
/** Safety valve for a scroller that never settles, or a tab with no frames. */
const SCROLL_SETTLE_TIMEOUT = 2000;
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
  advance(source: TourEventSource): Promise<void>;
  canAdvance(): boolean;
  canCancel(): boolean;
  canPrevious(): boolean;
  goTo(id: string): Promise<void>;
  isAdvanceDisabled(): boolean;
  isCancelDisabled(): boolean;
  isPreviousDisabled(): boolean;
  previous(source: TourEventSource): Promise<void>;
  cancel(source: TourEventSource): Promise<void>;
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
  /**
   * Resumes a frozen presentation on `step.target` after its previous target
   * reconnected or was replaced, without unmounting or replaying `appear()`.
   * A no-op when the driver isn't frozen for this step — callers only invoke
   * it in response to a `targetDisconnected` notification they are recovering
   * from, so a stale or superseded call should be silently ignored rather
   * than throw.
   */
  retarget(step: ActiveStep<T>, signal: AbortSignal): Promise<void> | void;
  /**
   * Reports that the navigation under way is waiting for the next step's
   * target to resolve. The presented step has not left yet, so its popover is
   * the one that carries the wait.
   */
  setTargetPending?(pending: boolean): void;
  /**
   * Hides or shows the popover of the running tour. A step still entering reads it as it is
   * presented. Every `start()` shows it again first.
   */
  setPopoverHidden?(hidden: boolean): void;
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

  retarget(_step: ActiveStep<T>, _signal: AbortSignal): void {}

  dispose(): void {}

  releaseMount(): void {}
}

export class DomTourViewDriver<T> implements TourViewDriver<T> {
  private readonly focusGuard = new FocusGuard();
  private readonly scrollLock = new ScrollLock();
  private readonly modalToken = {};
  private readonly stepCleanups: Array<() => void> = [];
  private readonly targetCleanups: Array<() => void> = [];
  private commands: TourViewCommands | null;
  private direction: TourDirection = "advance";
  private currentStep: ActiveStep<T> | null = null;
  private currentSignal: AbortSignal | null = null;
  private disposed = false;
  private generation = 0;
  private active = false;
  /**
   * True while the presentation is held in place on a lost target: the
   * reposition loop is stopped and interaction is force-blocked, but overlay,
   * popover and pointer stay mounted at their last known position instead of
   * disappearing. Cleared by `retarget()` (target came back) or `clear()`
   * (the caller gave up and is tearing the presentation down).
   */
  private frozen = false;
  /**
   * True between the spotlight's entrance and the popover's, the window in
   * which a step's scroll is still travelling. The tracking loop drives the
   * spotlight alone while it is set, and a lost target stops the tracking
   * instead of freezing the presentation.
   */
  private awaitingStepUi = false;
  private activeTarget: HTMLElement | null = null;
  private targetFocusedAtFreeze = false;
  private lastTargetRect: RectSnapshot | null = null;
  private lastViewport: ViewportSnapshot | null = null;
  private inertBranches: InertBranch[] = [];
  private modalDocument: Document | null = null;
  private modalRoot: HTMLElement | null = null;
  private overlay: OverlayElement | null = null;
  /** A command asked for while a visible popover was replaced, run once the new step is presented. */
  private pendingCommand: {
    command: TourViewCommand;
    generation: number;
    source: TourEventSource;
  } | null = null;
  private pointer: PointerElement | null = null;
  private pendingFocusGeneration: number | null = null;
  /**
   * The last click a presented step's button handled. It bubbles on to the window after the
   * command it ran started the next step, and must not be queued a second time there.
   */
  private handledTriggerClick: Event | null = null;
  private popover: PopoverElement | null = null;
  private presentationDirty = false;
  /** True while the controller waits for the next step's target, see `setTargetPending`. */
  private targetPending = false;
  /** True while the consumer hides the popover, see `setPopoverHidden`. */
  private popoverHidden = false;
  /**
   * The focus a clear gives back once the popover has faded out. Kept past a clear that a new show
   * supersedes, so that tour returns focus there instead of to the fading popover.
   */
  private focusToRestore: HTMLElement | null = null;
  /** The `allowInteraction` value the overlay, the page modality and the focus guard reflect. */
  private appliedAllowInteraction = false;
  /** Set when a live `allowInteraction` change started the pointer fade; the next frame clears it. */
  private pointerFading = false;
  private rafId: number | null = null;
  private rafCancel: ((id: number) => void) | null = null;
  private root: HTMLElement | null = null;
  private cancelScroll: (() => void) | null = null;

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
    this.overlay = element ? new OverlayElement(element) : null;
    this.overlay?.initializeProps();
    this.refreshRegisteredElements();
  }

  registerPopover(element: HTMLElement | null) {
    if (this.disposed) return;
    if (this.popover?.getElement() === element) return;
    if (!element && this.active) {
      this.releaseModality();
      this.focusGuard.deactivate();
      this.scrollLock.deactivate();
    }
    this.popover?.release();
    this.popover = element ? new PopoverElement(element) : null;
    this.popover?.initializeProps();
    if (element) this.refreshRegisteredElements();
  }

  registerPointer(element: HTMLElement | null) {
    if (this.disposed) return;
    if (this.pointer?.getElement() === element) return;
    this.pointer?.release();
    this.pointer = element ? new PointerElement(element) : null;
    this.pointer?.initializeProps();
    this.refreshRegisteredElements();
  }

  /**
   * Flags the presented popover as waiting for the next step's target, and
   * disables its advance control for as long as the wait lasts: the step the
   * user asked to leave stays on screen, and an advance that is already
   * refused by the controller must not keep looking available. Cleared by the
   * controller when the target settles, and by any teardown.
   */
  setTargetPending(pending: boolean): void {
    if (this.disposed || this.targetPending === pending) return;
    this.targetPending = pending;
    this.popover?.setAwaitingTarget(pending);
    const step = this.currentStep;
    if (!step) return;
    // A browser drops the focus of a control it sees disabled, and it drops it on the body:
    // outside a page the tour made inert, with nothing to tab back from. Read before the sync,
    // moved after it so the guard skips the control it just disabled, and left alone on a step
    // that handed focus to the page.
    const focused = this.popover?.getElement()?.ownerDocument.activeElement;
    const refocus =
      pending &&
      step.autoFocuses() &&
      this.findTriggers("advance").includes(focused as HTMLButtonElement);
    this.syncControlState(step);
    if (refocus) this.focusGuard.focus();
  }

  /**
   * Hides the popover and hands the page back while it is hidden: nothing is left to trap focus
   * in, so the page leaves `inert`, focus moves from the popover to the target, and the shortcuts
   * stop. The overlay, the pointer and the scroll lock stay. Showing it again replays the entrance
   * and makes the step modal again. A step still entering applies it once presented.
   */
  setPopoverHidden(hidden: boolean): void {
    if (this.disposed || this.popoverHidden === hidden) return;
    this.popoverHidden = hidden;
    const step = this.currentStep;
    const target = this.activeTarget;
    if (!this.active || !step || !target) return;
    if (hidden) {
      this.liftModality();
      this.concealPopover();
    } else {
      this.revealPopover(step, target, this.generation);
    }
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
    const replaceVisiblePopover =
      this.active && !this.popoverHidden && onBeforePopoverAppear !== undefined;
    let removeTransitionListeners = () => {};
    try {
      this.cleanupStepResources();
      this.throwIfStale(generation, signal);
      this.active = false;
      this.frozen = false;
      this.activeTarget = null;
      this.targetFocusedAtFreeze = false;
      this.currentStep = step;
      this.currentSignal = signal;
      this.direction = direction;
      this.lastTargetRect = null;
      this.lastViewport = null;
      this.presentationDirty = false;
      this.awaitingStepUi = true;
      const modal = !step.allowsInteraction();
      // Claimed before anything moves: a second modal tour fails without being presented.
      if (modal) this.claimModal();
      // Blocks the page until a modal step is presented, and queues shortcuts while a visible
      // popover is replaced. On any other step it lets every key through.
      const onKeydown = (event: Event) =>
        this.queueTransitionKeydown(
          event as KeyboardEvent,
          step,
          generation,
          replaceVisiblePopover,
        );
      // The popover being replaced no longer takes pointer input, but Enter or Space on its focused
      // button still clicks it: queue that button's command like a shortcut.
      const onClick = (event: Event) => {
        if (replaceVisiblePopover) this.queueTransitionClick(event, step, generation);
      };
      const currentWindow = this.getWindow();
      if (typeof currentWindow?.addEventListener === "function") {
        currentWindow.addEventListener("keydown", onKeydown);
        currentWindow.addEventListener("click", onClick);
        removeTransitionListeners = () => {
          currentWindow.removeEventListener("keydown", onKeydown);
          currentWindow.removeEventListener("click", onClick);
        };
      }
      const target = step.target;
      if (!target) return;
      this.activeTarget = target;

      // Before inerting the page: inert blurs the trigger that started the tour, and focus
      // could no longer be restored to it.
      this.focusGuard.captureInitialFocus(target, this.focusToRestore);
      const scrolling = this.beginTargetScroll(step, target, signal);
      this.throwIfStale(generation, signal);
      this.initializeElements(step, replaceVisiblePopover);
      // Read late, and again after the scroll: the rect the popover is placed
      // against has to be one that will not move again.
      const resolveRect = () => presentationRect(step, target);
      await this.appear(
        resolveRect,
        step,
        generation,
        scrolling,
        replaceVisiblePopover,
        onBeforePopoverAppear,
      );
      this.throwIfStale(generation, signal);
      const targetRect = resolveRect();
      this.lastTargetRect = snapshotRect(targetRect);
      this.lastViewport = snapshotViewport(target);
      this.active = true;
      // Only now, as focus moves into the presented popover, like a native modal dialog. Inerting
      // the page while the popover is still hidden pulls the screen reader's cursor out of the
      // tree with nowhere to go, and VoiceOver then stays silent. Read live: `beforeEnter` or the
      // entrance may have changed `behavior.allowInteraction` since the modal claim above.
      this.engagePopover(step, target, direction, generation);
      this.syncScrollLock(step);
      this.throwIfStale(generation, signal);
      removeTransitionListeners();
      removeTransitionListeners = () => {};
      this.attachStepResources(step, target, generation, signal);
    } catch (error) {
      if (this.isCurrentGeneration(generation)) this.releaseModality();
      throw error;
    } finally {
      removeTransitionListeners();
      removeAbort();
    }
  }

  async clear(signal: AbortSignal): Promise<void> {
    if (signal.aborted || this.disposed) this.releaseModality();
    this.throwIfAborted(signal);
    const generation = this.beginGeneration();
    const removeAbort = this.cancelAnimationsOnAbort(signal);
    this.setTargetPending(false);
    // Focus goes back once the popover has faded out, not in the task that lifts `inert` from the
    // page: screen readers ignore focus moved onto content that just rejoined their tree.
    try {
      this.cleanupStepResources();
      this.releaseModality();
      this.focusToRestore = this.focusGuard.release() ?? this.focusToRestore;
      this.scrollLock.deactivate();
      this.throwIfStale(generation, signal);
      this.active = false;
      this.frozen = false;
      this.awaitingStepUi = false;
      this.activeTarget = null;
      this.targetFocusedAtFreeze = false;
      this.currentStep = null;
      this.currentSignal = null;
      this.lastTargetRect = null;
      this.lastViewport = null;
      await Promise.allSettled([
        this.overlay?.disappear() ?? Promise.resolve(),
        this.popover?.disappear() ?? Promise.resolve(),
        this.pointer?.disappear() ?? Promise.resolve(),
      ]);
    } finally {
      // Superseded, the focus stays pending for the show or clear that replaced this one.
      if (this.isCurrentGeneration(generation)) {
        this.focusToRestore?.focus();
        this.focusToRestore = null;
      }
      removeAbort();
    }
    // After restoring focus: restoring it may itself start the next tour.
    this.throwIfStale(generation, signal);
  }

  releaseMount(): void {
    if (this.disposed) return;
    this.setTargetPending(false);
    this.beginGeneration();
    this.cleanupStepResources();
    this.releaseModality();
    this.focusGuard.deactivate();
    this.scrollLock.deactivate();
    this.active = false;
    this.frozen = false;
    this.awaitingStepUi = false;
    this.activeTarget = null;
    this.targetFocusedAtFreeze = false;
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
    // A frozen presentation has no live target to read a rect from — leave it
    // parked as-is until `retarget()` resumes it, rather than calling
    // `appear()` against the disconnected node.
    if (!this.active || this.frozen || !this.currentStep || !this.lastTargetRect) return;
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
    this.activeTarget = target;
    this.initializeElements(step, false);
    this.awaitingStepUi = true;
    // Re-registration replays the entrance in place: no scroll, and the rect
    // is the one the step was already parked on rather than a fresh reading.
    await this.appear(() => targetRect as DOMRect, step, generation, null, false);
    this.throwIfStale(generation);
    this.engagePopover(step, target, this.direction, generation);
    this.syncScrollLock(step);
    this.throwIfStale(generation);
    this.attachStepResources(step, target, generation, signal);
  }

  private initializeElements(step: ActiveStep<T>, replaceVisiblePopover: boolean) {
    const interactionAllowed = step.allowsInteraction();
    this.overlay?.initializeProps();
    this.overlay?.setAnimationOptions(
      animationOptions(step, step.props.get().overlay, this.overlay.getElement()),
    );
    this.overlay?.setInteractionAllowed(interactionAllowed);
    this.appliedAllowInteraction = interactionAllowed;
    this.popover?.initializeProps(!replaceVisiblePopover);
    this.popover?.setAnimationOptions(
      animationOptions(step, step.props.get().popover, this.popover.getElement()),
    );
    this.pointer?.initializeProps();
    this.pointer?.setAnimationOptions(
      animationOptions(step, step.props.get().indicator, this.pointer.getElement()),
    );
  }

  private syncModality(interactionAllowed: boolean) {
    if (interactionAllowed) {
      this.releaseModality();
      return;
    }

    this.claimModal();
    // A hidden popover leaves nothing to interact with: the page stays reachable until it is back.
    if (this.popoverHidden) {
      this.liftModality();
      return;
    }
    const popover = this.popover?.getElement();
    if (isHTMLElement(popover, this.root ?? popover)) popover.setAttribute("aria-modal", "true");

    const root = this.root;
    if (!root || this.modalRoot === root) return;
    const document = root.ownerDocument;

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

  private claimModal() {
    const document = this.root?.ownerDocument;
    if (!document) return;
    const owner = ACTIVE_MODAL_BY_DOCUMENT.get(document);
    if (owner && owner !== this.modalToken) {
      throw new Error("GlowTour.js only supports one active modal tour per document");
    }
    ACTIVE_MODAL_BY_DOCUMENT.set(document, this.modalToken);
    this.modalDocument = document;
  }

  private releaseModality() {
    this.liftModality();
    const document = this.modalDocument;
    if (document && ACTIVE_MODAL_BY_DOCUMENT.get(document) === this.modalToken) {
      ACTIVE_MODAL_BY_DOCUMENT.delete(document);
    }
    this.modalDocument = null;
  }

  /** Gives the page back without releasing the document's modal claim. */
  private liftModality() {
    this.popover?.getElement()?.removeAttribute("aria-modal");
    this.restoreInertBranches();
    this.modalRoot = null;
  }

  private restoreInertBranches() {
    for (const { element, previous } of this.inertBranches.splice(0)) {
      if (element.getAttribute("inert") !== "") continue;
      if (previous === null) element.removeAttribute("inert");
      else element.setAttribute("inert", previous);
    }
  }

  /**
   * Brings the spotlight onto the target, then hands the step's popover and
   * pointer over, in that order but not in lockstep.
   *
   * The spotlight's entrance never gates the popover's: the two animate side
   * by side, as they always have. What does gate the popover is the step's
   * scroll. It is pinned by a transform it only rewrites on entrance, so a
   * rect that is still travelling would make it jump through a fade every
   * fifty pixels; it waits for the page to stop and enters on a rect that will
   * not move again. Meanwhile the spotlight tracks the target down the page.
   */
  private async appear(
    resolveRect: () => DOMRect,
    step: ActiveStep<T>,
    generation: number,
    scrolling: Promise<void> | null,
    hadVisiblePopover: boolean,
    onBeforePopoverAppear?: () => void | Promise<void>,
  ) {
    // Read first: a geometry read that throws must not leave the step-UI
    // promise orphaned and unawaited. Reading starts no animation, so the
    // ordering below is unaffected.
    const spotlightRect = resolveRect();
    // Started before the spotlight so the outgoing popover's fade-out is the
    // first animation of the transition, as it has always been.
    const stepUi = this.presentStepUi(
      resolveRect,
      step,
      generation,
      scrolling,
      hadVisiblePopover,
      onBeforePopoverAppear,
    );
    // While the page is travelling the tracking loop owns the cutout, so the
    // spotlight commits its geometry instead of animating towards a rect the
    // scroll is about to invalidate.
    const spotlight = this.overlay?.moveToTarget(
      spotlightRect,
      this.elementProps(step),
      scrolling !== null,
    );
    // Started here rather than once the outgoing popover has faded: that fade
    // lasts about as long as the scroll itself, so tracking would only begin
    // as the page came to rest and the spotlight would sit at the target's
    // pre-scroll position for the whole journey.
    if (scrolling) this.schedulePosition(generation);
    await Promise.all([spotlight ?? Promise.resolve(), stepUi]);
  }

  /**
   * Retires the outgoing popover, commits the incoming step's content in its
   * place, waits out the step's scroll, and brings the popover and pointer in.
   *
   * Deliberately one async frame. With nothing to retire, nothing to commit
   * and nothing to scroll, the entrance animations are created in the tick
   * this was called in — which is what callers that abort mid-flight rely on,
   * since `cancelAnimationsOnAbort` can only cancel animations that exist.
   *
   * The content commit runs even when no popover is mounted: it carries the
   * controller's step-index commit and must not be skipped.
   */
  private async presentStepUi(
    resolveRect: () => DOMRect,
    step: ActiveStep<T>,
    generation: number,
    scrolling: Promise<void> | null,
    hadVisiblePopover: boolean,
    onBeforePopoverAppear?: () => void | Promise<void>,
  ) {
    if (hadVisiblePopover) await this.popover?.disappear(false);
    if (onBeforePopoverAppear) {
      await onBeforePopoverAppear();
      this.syncControlState(step);
      this.syncShortcutLabels(step);
    }
    // The tracking loop that `appear` started keeps running afterwards: it is
    // the same loop the step uses for the rest of its life, and
    // `attachStepResources` would have started it a few statements later.
    if (scrolling) await scrolling;
    // A show aborted while retiring or scrolling must not start an entrance
    // animation here: nothing would ever cancel it, and the transition would
    // hang on an animation that never settles.
    if (!this.isCurrentGeneration(generation) || this.currentSignal?.aborted) return;
    this.awaitingStepUi = false;
    await this.enterStepUi(resolveRect(), step);
  }

  /** The popover and pointer entrance itself, started synchronously. */
  private enterStepUi(targetRect: DOMRect, step: ActiveStep<T>) {
    const popoverPlacement = this.popover?.resolvePosition(
      targetRect,
      this.elementProps(step),
    ).placement;
    return Promise.all([
      (!this.popoverHidden && this.popover?.present(targetRect, this.elementProps(step))) ||
        Promise.resolve(),
      this.presentPointer(targetRect, step, popoverPlacement) ?? Promise.resolve(),
    ]);
  }

  /** Fades the pointer in on the target, or out when the step does not show it. */
  private presentPointer(
    targetRect: DOMRect,
    step: ActiveStep<T>,
    popoverPlacement: ResolvedPlacement | undefined,
  ) {
    return this.isPointerEnabled(step)
      ? this.pointer?.moveToTarget(targetRect, step.props.get(), true, popoverPlacement)
      : this.pointer?.disappear();
  }

  private attachStepResources(
    step: ActiveStep<T>,
    target: HTMLElement,
    generation: number,
    signal: AbortSignal,
  ) {
    let initialPropsNotification = true;
    this.stepCleanups.push(
      step.props.subscribe(() => {
        if (!this.isCurrentGeneration(generation)) return;
        if (initialPropsNotification) {
          initialPropsNotification = false;
          return;
        }
        this.presentationDirty = true;
        this.syncScrollLock(step);
        if (step.allowsInteraction() === this.appliedAllowInteraction) return;
        this.syncInteraction(step);
        // The pointer fade has started: the next frame must not snap it with `syncVisibility`.
        this.pointerFading = step.allowsInteraction() === this.appliedAllowInteraction;
      }),
    );
    // A change made while the step was still entering is applied now that it is presented.
    if (step.allowsInteraction() !== this.appliedAllowInteraction) this.syncInteraction(step);
    this.stepCleanups.push(
      this.commands?.subscribeCapabilities?.((active) => {
        if (!this.isCurrentGeneration(generation)) return;
        this.syncControlState(step);
        if (active && this.pendingFocusGeneration === generation) {
          this.pendingFocusGeneration = null;
          this.focusGuard.focus();
        }
        if (active) this.flushPendingCommand(step, generation);
      }) ?? (() => {}),
    );
    this.attachTargetResources(step, target, generation, signal);
    const currentWindow = this.getWindow(target);
    if (typeof currentWindow?.addEventListener === "function") {
      this.listen(currentWindow, "keydown", (event) => {
        if (this.isCurrentGeneration(generation)) this.handleKeydown(event as KeyboardEvent);
      });
      this.listen(currentWindow, "click", (event) => {
        // Reads `this.activeTarget` rather than closing over `target`: after a
        // `retarget()` this same long-lived listener must judge overlay clicks
        // against the new element, not the one it was first attached for.
        if (this.isCurrentGeneration(generation) && this.activeTarget) {
          this.handleOverlayClick(event as MouseEvent, step, this.activeTarget);
        }
      });
    }
    this.attachButtonHandlers(step);
    this.observeControls(step, generation);
    this.syncControlState(step);
    this.syncShortcutLabels(step);
    this.schedulePosition(generation);
  }

  /**
   * Binds the step's custom event handlers to its target element. Split out
   * from `attachStepResources` so a lost-then-recovered target can be
   * rebound on its own by `retarget()`, without re-subscribing the
   * step-level resources (props, capabilities, controls) that never left.
   */
  private attachTargetResources(
    step: ActiveStep<T>,
    target: HTMLElement,
    generation: number,
    signal: AbortSignal,
  ) {
    if (step.detached) return;
    for (const handler of step.definition.targetEvents) {
      const listener = (event: Event) => {
        if (!this.isCurrentGeneration(generation)) return;
        const context = Object.freeze({
          advance: () => this.commandForStep("advance", step, signal),
          cancel: () => this.commandForStep("cancel", step, signal),
          goTo: async (id: string) => {
            if (!signal.aborted && this.currentStep === step) await this.commands?.goTo(id);
          },
          previous: () => this.commandForStep("previous", step, signal),
          direction: step.direction,
          initialProps: step.initialProps,
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
      this.listen(target, handler.event, listener, undefined, this.targetCleanups);
    }
  }

  private listen(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
    bucket: Array<() => void> = this.stepCleanups,
  ) {
    target.addEventListener(type, listener, options);
    bucket.push(() => target.removeEventListener(type, listener, options));
  }

  private schedulePosition(generation = this.generation) {
    if (
      !this.isCurrentGeneration(generation) ||
      !this.currentStep ||
      this.rafId !== null ||
      this.frozen
    )
      return;
    const frames = this.frameScheduler(this.currentStep.target);
    if (!frames) return;
    this.rafCancel = frames.cancel;
    this.rafId = frames.request(() => {
      this.rafId = null;
      this.rafCancel = null;
      if (!this.isCurrentGeneration(generation)) return;
      this.updatePosition(generation);
      this.schedulePosition(generation);
    });
  }

  /**
   * Frame scheduling for the target's own realm, falling back to the ambient
   * one when that realm exposes no frame callbacks. Shared by the tracking
   * loop and the scroll sentinel so both read the same clock.
   */
  private frameScheduler(context?: Node | null) {
    const owner = context?.ownerDocument?.defaultView;
    const ownerRequest = owner?.requestAnimationFrame;
    const ownerCancel = owner?.cancelAnimationFrame;
    const ownerHasFrameCapability =
      typeof ownerRequest === "function" || typeof ownerCancel === "function";
    const request = ownerHasFrameCapability ? ownerRequest : globalThis.requestAnimationFrame;
    const cancel = ownerHasFrameCapability ? ownerCancel : globalThis.cancelAnimationFrame;
    if (typeof request !== "function" || typeof cancel !== "function") return null;
    const frameWindow = ownerHasFrameCapability && owner ? owner : globalThis;
    return {
      request: (callback: FrameRequestCallback) => request.call(frameWindow, callback),
      cancel: (id: number) => cancel.call(frameWindow, id),
    };
  }

  private updatePosition(generation: number) {
    const step = this.currentStep;
    const target = step?.target;
    if (!this.isCurrentGeneration(generation) || !step || !target) return;
    if (!this.isCurrentTargetAvailable(target)) {
      // Freezing needs a controller that can recover, and the controller only
      // recovers once the tour is active — which it is not until `show()`
      // resolves. A target lost while the step is still scrolling therefore
      // idles here instead: the scroll settles, the step finishes entering,
      // and the next frame freezes it through the normal path.
      if (!this.awaitingStepUi) this.freezeForDisconnectedTarget(step, target, generation);
      return;
    }
    const targetRect = presentationRect(step, target);
    const targetSnapshot = snapshotRect(targetRect);
    const viewportSnapshot = snapshotViewport(target);
    const presentationChanged = this.presentationDirty;
    if (
      !presentationChanged &&
      sameRect(targetSnapshot, this.lastTargetRect) &&
      sameViewport(viewportSnapshot, this.lastViewport)
    )
      return;
    if (presentationChanged) {
      this.overlay?.setAnimationOptions(
        animationOptions(step, step.props.get().overlay, this.overlay.getElement()),
      );
      this.popover?.setAnimationOptions(
        animationOptions(step, step.props.get().popover, this.popover.getElement()),
      );
      this.pointer?.setAnimationOptions(
        animationOptions(step, step.props.get().indicator, this.pointer.getElement()),
      );
      this.syncControlState(step);
      this.syncShortcutLabels(step);
    }
    this.overlay?.updatePosition(
      targetRect,
      this.elementProps(step),
      presentationChanged,
      (transition) => this.observeDynamicOperation(transition, generation),
    );
    // While the step's scroll is still running the spotlight tracks the target
    // on its own. The popover and the pointer have not entered yet and must
    // not be dragged along: the popover is pinned by a transform it only
    // rewrites on entrance, so following a moving rect would make it jump
    // through a fade every fifty pixels of travel.
    if (!this.awaitingStepUi) this.trackStepUi(targetRect, step, generation, presentationChanged);
    this.lastTargetRect = targetSnapshot;
    this.lastViewport = viewportSnapshot;
    if (presentationChanged) this.presentationDirty = false;
  }

  /** Per-frame follow-up for the popover and pointer, once they are on screen. */
  private trackStepUi(
    targetRect: DOMRect,
    step: ActiveStep<T>,
    generation: number,
    presentationChanged: boolean,
  ) {
    const popoverPlacement = this.placePopover(targetRect, step, generation);
    if (presentationChanged) {
      if (this.pointerFading) this.pointerFading = false;
      else
        this.pointer?.syncVisibility(
          this.isPointerEnabled(step),
          targetRect,
          step.props.get(),
          popoverPlacement,
        );
    } else if (this.isPointerEnabled(step)) {
      const pointer = this.pointer?.getElement();
      if (pointer?.getAttribute("aria-hidden") === "true") {
        this.observeDynamicOperation(
          this.pointer?.moveToTarget(targetRect, step.props.get(), true, popoverPlacement),
          generation,
        );
      } else {
        this.pointer?.updatePosition(targetRect, step.props.get(), popoverPlacement);
      }
    } else if (this.pointer?.getElement()?.getAttribute("aria-hidden") !== "true") {
      this.observeDynamicOperation(this.pointer?.disappear(), generation);
    }
  }

  /**
   * Moves the popover along with its target and returns its placement. A hidden popover stays
   * where it is: moving it would fade it back in. The pointer still keeps clear of its placement.
   */
  private placePopover(targetRect: DOMRect, step: ActiveStep<T>, generation: number) {
    if (this.popoverHidden) {
      return this.popover?.resolvePosition(targetRect, this.elementProps(step)).placement;
    }
    return this.popover?.updatePosition(targetRect, this.elementProps(step), (reposition) =>
      this.observeDynamicOperation(reposition, generation),
    );
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
      this.popoverHidden ||
      event.defaultPrevented ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    if (event.key === "Tab" && !step.allowsInteraction()) {
      this.loopFocus(event);
      return;
    }
    const command = this.keyboardCommand(event, step, (command) => this.canCommand(command, step));
    if (!command) return;
    event.preventDefault();
    void this.command(command, "keyboard");
  }

  /**
   * The keyboard shortcut a keydown asks for, if `available` allows it. `null` leaves the key to the
   * browser, as Enter on a focused control is: on a tour button, the click it produces runs that
   * button's own command after the consumer's click handlers, like a pointer click.
   */
  private keyboardCommand(
    event: KeyboardEvent,
    step: ActiveStep<T>,
    available: (command: TourViewCommand) => boolean,
  ): TourViewCommand | null {
    if (activatesControl(event, this.root)) return null;
    const controls = step.props.get().controls;
    const shortcut = (command: TourViewCommand) =>
      (controls?.[command]?.keys ?? DEFAULT_SHORTCUTS[command]).includes(event.key) &&
      available(command);
    // Escape cancels even from an editable field; the navigation shortcuts do not.
    return shortcut("cancel")
      ? "cancel"
      : isEditable(event.target, this.root)
        ? null
        : shortcut("advance")
          ? "advance"
          : shortcut("previous")
            ? "previous"
            : null;
  }

  private handleOverlayClick(event: MouseEvent, step: ActiveStep<T>, target: HTMLElement) {
    if (this.currentStep !== step || event.defaultPrevented) return;
    if (step.allowsInteraction()) return;
    const path = event.composedPath();
    const popover = this.popover?.getElement();
    const pointer = this.pointer?.getElement();
    // A detached step stands on the body, which every click path includes.
    if (
      (!step.detached && path.includes(target)) ||
      (popover && path.includes(popover)) ||
      (pointer && path.includes(pointer))
    )
      return;
    const overlayClick = step.props.get().behavior?.overlayClick ?? "none";
    if (overlayClick === "advance" && this.canCommand("advance", step)) {
      void this.command("advance", "overlay");
    } else if (overlayClick === "cancel" && this.canCommand("cancel", step)) {
      void this.command("cancel", "overlay");
    }
  }

  private queueTransitionKeydown(
    event: KeyboardEvent,
    step: ActiveStep<T>,
    generation: number,
    queue: boolean,
  ) {
    const target = event.target;
    const root = this.root;
    if (
      !this.isCurrentGeneration(generation) ||
      event.defaultPrevented ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    // A modal step inerts the page only once presented. Until then keys must not act on the page,
    // as inert would have prevented: a second Enter on the trigger would start the tour again.
    if (
      !step.allowsInteraction() &&
      isHTMLElement(target, root) &&
      target !== target.ownerDocument.body &&
      !root?.contains(target)
    ) {
      event.preventDefault();
      return;
    }
    if (!queue) return;
    const command = this.keyboardCommand(event, step, (command) =>
      isControlAvailable(step.props.get(), command),
    );
    if (!command) return;
    event.preventDefault();
    this.pendingCommand ??= { command, generation, source: "keyboard" };
  }

  /**
   * Queues the command of a tour button clicked while a visible popover is replaced. Listening on
   * the window runs after the consumer's own click handlers, so a prevented click queues nothing.
   */
  private queueTransitionClick(event: Event, step: ActiveStep<T>, generation: number) {
    const scope = this.root ?? this.popover?.getElement();
    if (
      !this.isCurrentGeneration(generation) ||
      event.defaultPrevented ||
      event === this.handledTriggerClick ||
      !isHTMLElement(scope, scope) ||
      !isElement(event.target, scope)
    )
      return;
    const match = this.findClickedTrigger(event.target, scope);
    if (
      !match ||
      this.isLiveDisabled(match.trigger) ||
      !isControlAvailable(step.props.get(), match.command)
    )
      return;
    this.pendingCommand ??= { command: match.command, generation, source: "trigger" };
  }

  private flushPendingCommand(step: ActiveStep<T>, generation: number) {
    const pending = this.pendingCommand;
    if (!pending || pending.generation !== generation) return;
    this.pendingCommand = null;
    queueMicrotask(() => {
      if (
        !this.isCurrentGeneration(generation) ||
        this.currentStep !== step ||
        !this.canCommand(pending.command, step)
      )
        return;
      void this.commandForGeneration(pending.command, generation, pending.source);
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

  /**
   * Makes a presented step modal and moves focus into its popover, or keeps the popover hidden. A
   * popover shown again after the entrance passed over it enters now.
   */
  private engagePopover(
    step: ActiveStep<T>,
    target: HTMLElement,
    direction: TourDirection,
    generation: number,
  ) {
    this.syncModality(step.allowsInteraction());
    if (this.popoverHidden) this.concealPopover();
    else if (this.isPopoverConcealed()) this.revealPopover(step, target, generation);
    else this.activateFocus(step, target, direction, generation);
  }

  /**
   * Fades the popover out and stops guarding focus. Focus left in the popover goes to the target,
   * or is dropped when the target cannot take it: `inert` would otherwise drop it on the body. The
   * focus the tour gives back when it ends is kept for the step that shows the popover again.
   */
  private concealPopover() {
    this.focusToRestore = this.focusGuard.release() ?? this.focusToRestore;
    const popover = this.popover;
    const element = popover?.getElement();
    if (!popover || !element) return;
    const focused = element.ownerDocument.activeElement;
    if (isHTMLElement(focused, element) && element.contains(focused)) {
      focused.blur();
      this.activeTarget?.focus();
    }
    if (this.isPopoverConcealed()) return;
    popover.cancelAnimations();
    this.observeDynamicOperation(popover.disappear(), this.generation);
  }

  /**
   * Replays the popover's entrance on the rect the step was last placed on (a frozen step has no
   * live target to measure), then makes the step modal again.
   */
  private revealPopover(step: ActiveStep<T>, target: HTMLElement, generation: number) {
    this.focusGuard.captureInitialFocus(target, this.focusToRestore);
    this.popover?.cancelAnimations();
    this.observeDynamicOperation(
      this.popover?.present(this.lastTargetRect as DOMRect, this.elementProps(step)).then(() => {
        if (!this.isCurrentGeneration(generation) || this.popoverHidden) return;
        this.syncModality(!this.frozen && step.allowsInteraction());
        this.activateFocus(step, target, this.direction, generation);
      }),
      generation,
    );
  }

  private isPopoverConcealed() {
    return this.popover?.getElement()?.getAttribute("aria-hidden") === "true";
  }

  private activateFocus(
    step: ActiveStep<T>,
    target: HTMLElement,
    direction: TourDirection,
    generation: number,
  ) {
    const popover = this.popover?.getElement();
    if (!isHTMLElement(popover, this.root ?? popover)) return;
    const autoFocus = step.autoFocuses();
    const deferFocus = autoFocus && this.commands?.subscribeCapabilities !== undefined;
    if (deferFocus) this.pendingFocusGeneration = generation;
    this.focusGuard.activate({
      allowedTarget: target,
      allowTargetInteraction: step.allowsInteraction(),
      autoFocus,
      deferFocus,
      direction,
      fallback: this.root ?? popover.parentElement,
      popover,
    });
  }

  private syncScrollLock(step: ActiveStep<T>) {
    if (step.allowsScroll()) {
      this.scrollLock.deactivate();
      return;
    }
    this.scrollLock.activate(this.root?.ownerDocument ?? this.popover?.getElement()?.ownerDocument);
  }

  private syncShortcutLabels(step: ActiveStep<T>) {
    for (const command of ["advance", "previous"] as const) {
      const shortcuts = isControlAvailable(step.props.get(), command)
        ? (step.props.get().controls?.[command]?.keys ?? DEFAULT_SHORTCUTS[command])
        : [];
      for (const trigger of this.findTriggers(command)) syncKeyShortcuts(trigger, shortcuts);
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
      this.handledTriggerClick = event;
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
      void this.commandForGeneration(command, generation, "trigger");
    });
  }

  private syncControlState(step: ActiveStep<T>) {
    for (const advance of this.findTriggers("advance")) {
      this.syncControl(
        advance,
        this.commands?.isAdvanceDisabled() === true ||
          !isControlAvailable(step.props.get(), "advance"),
      );
    }
    for (const previous of this.findTriggers("previous")) {
      this.syncControl(
        previous,
        this.commands?.isPreviousDisabled() === true ||
          !isControlAvailable(step.props.get(), "previous"),
      );
    }
    for (const cancel of this.findTriggers("cancel")) {
      this.syncControl(
        cancel,
        this.commands?.isCancelDisabled() === true ||
          !isControlAvailable(step.props.get(), "cancel"),
      );
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

  private async command(command: TourViewCommand, source: TourEventSource) {
    if (this.disposed) return;
    if (command === "advance") await this.commands?.advance(source);
    else if (command === "previous") await this.commands?.previous(source);
    else await this.commands?.cancel(source);
  }

  private commandForGeneration(
    command: TourViewCommand,
    generation: number,
    source: TourEventSource,
  ) {
    return this.isCurrentGeneration(generation) ? this.command(command, source) : Promise.resolve();
  }

  private commandForStep(command: TourViewCommand, step: ActiveStep<T>, signal: AbortSignal) {
    // Reached from a step action's `context.advance()` — the consumer's own code.
    return !signal.aborted && this.currentStep === step
      ? this.command(command, "api")
      : Promise.resolve();
  }

  private canCommand(
    command: TourViewCommand,
    step: ActiveStep<T>,
    trigger?: HTMLButtonElement | null,
  ) {
    if (this.isConsumerDisabled(trigger ?? null) || !isControlAvailable(step.props.get(), command))
      return false;
    if (command === "advance") return this.commands?.canAdvance?.() ?? true;
    if (command === "previous") return this.commands?.canPrevious?.() ?? true;
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

  /**
   * The props the overlay and popover render: the step's own, flagged when the step is detached so
   * the overlay drops its cutout and the popover centers itself.
   */
  private elementProps(step: ActiveStep<T>): TourElementStep {
    const props = step.props.get();
    return step.detached ? { ...props, detached: true } : props;
  }

  private isPointerEnabled(step: ActiveStep<T>) {
    return step.allowsInteraction() && step.props.get().indicator?.hidden !== true;
  }

  private cleanupStepResources() {
    this.cancelScroll?.();
    this.cancelScroll = null;
    this.presentationDirty = false;
    this.pointerFading = false;
    if (this.rafId !== null) this.rafCancel?.(this.rafId);
    this.rafId = null;
    this.rafCancel = null;
    this.cleanupTargetResources();
    for (const cleanup of this.stepCleanups.splice(0)) cleanup();
  }

  private cleanupTargetResources() {
    for (const cleanup of this.targetCleanups.splice(0)) cleanup();
  }

  private isCurrentTargetAvailable(target: HTMLElement) {
    const rootDocument = this.root?.ownerDocument;
    return target.isConnected && (!rootDocument || target.ownerDocument === rootDocument);
  }

  /**
   * Holds the presentation exactly where it is when its target disappears,
   * instead of tearing it down: overlay, popover and pointer stay mounted at
   * their last known rect, focus guard and scroll lock stay engaged, and only
   * the target's own listeners (now pointing at a dead node) are removed.
   * The generation is deliberately left untouched — popover buttons, the
   * keyboard shortcuts and any pending capability/focus bookkeeping must
   * keep working while frozen, since the popover is the user's escape hatch
   * out of a tour whose target never comes back. `commands.targetDisconnected`
   * drives the actual recovery (grace period, then the configured strategy)
   * and eventually calls back into `retarget()` or `clear()`.
   */
  private freezeForDisconnectedTarget(
    step: ActiveStep<T>,
    target: HTMLElement,
    generation: number,
  ) {
    if (!this.isCurrentGeneration(generation) || this.frozen) return;
    this.frozen = true;
    if (this.rafId !== null) this.rafCancel?.(this.rafId);
    this.rafId = null;
    this.rafCancel = null;
    this.targetFocusedAtFreeze = this.isFocusInsideTarget(target);
    this.cleanupTargetResources();
    this.applyInteractionLock(step, true);
    void Promise.resolve(this.commands?.targetDisconnected(target)).catch((error) => {
      void this.commands?.reportError(error).catch(() => {});
    });
  }

  /**
   * Blocks (or restores) interaction with the underlying page independently
   * of `step.behavior.allowInteraction`. Used to force interaction off while
   * frozen — the cutout no longer corresponds to anything after a reflow, so
   * it must not let clicks through even on a step that normally allows them —
   * and to restore the step's own setting once retargeted.
   */
  private applyInteractionLock(step: ActiveStep<T>, locked: boolean) {
    const allowed = !locked && step.allowsInteraction();
    this.overlay?.setInteractionAllowed(allowed);
    this.syncModality(allowed);
  }

  /** Applies the step's own interaction setting to the overlay, the page modality and the focus guard. */
  private applyInteraction(step: ActiveStep<T>, target: HTMLElement) {
    this.applyInteractionLock(step, false);
    this.appliedAllowInteraction = step.allowsInteraction();
    const popover = this.popover?.getElement();
    if (!this.popoverHidden && isHTMLElement(popover, this.root ?? popover)) {
      this.focusGuard.update({
        allowedTarget: target,
        allowTargetInteraction: step.allowsInteraction(),
        direction: this.direction,
        fallback: this.root ?? popover.parentElement,
        popover,
      });
    }
  }

  /**
   * Applies a `behavior.allowInteraction` changed through the step props while the step is on
   * screen. A step still entering reads the new value when it presents, and a frozen one keeps
   * interaction off until `retarget()` restores it. The indicator fades in or out instead of snapping.
   */
  private syncInteraction(step: ActiveStep<T>) {
    const target = this.activeTarget;
    if (
      this.disposed ||
      !this.active ||
      this.frozen ||
      this.awaitingStepUi ||
      this.currentStep !== step ||
      !target
    )
      return;
    const focusWasInTarget = this.isFocusInsideTarget(target);
    this.applyInteraction(step, target);
    if (focusWasInTarget && !step.allowsInteraction() && step.autoFocuses())
      this.focusGuard.focus();
    const targetRect = target.getBoundingClientRect();
    this.pointer?.cancelAnimations();
    this.observeDynamicOperation(
      this.presentPointer(
        targetRect,
        step,
        this.popover?.resolvePosition(targetRect, this.elementProps(step)).placement,
      ),
      this.generation,
    );
  }

  private isFocusInsideTarget(target: HTMLElement) {
    const activeElement = target.ownerDocument?.activeElement;
    if (!activeElement) return false;
    return activeElement === target || target.contains(activeElement);
  }

  /**
   * Resumes a presentation frozen by `freezeForDisconnectedTarget` on its new
   * target: reattaches the target-bound listeners, restores the step's own
   * interaction setting, and lets the existing reposition loop tween overlay
   * and popover to the new rect on the next frame. Deliberately skips
   * `appear()` (no re-entrance animation) and `activateFocus()` (focus stays
   * where the user left it), only reclaiming it if it was on the target that
   * just disappeared and the step auto focuses.
   */
  async retarget(step: ActiveStep<T>, signal: AbortSignal): Promise<void> {
    this.throwIfAborted(signal);
    if (this.disposed || !this.frozen || this.currentStep !== step) return;
    const target = step.target;
    if (!target) return;
    this.frozen = false;
    this.currentSignal = signal;
    this.activeTarget = target;
    this.applyInteraction(step, target);
    this.attachTargetResources(step, target, this.generation, signal);
    // Without auto focus, focus lost with the removed target stays lost: the page owns it.
    if (this.targetFocusedAtFreeze && step.autoFocuses()) {
      // A step that detached, or no longer allows interaction, blocks the page: focus goes back
      // into the popover instead of staying lost on the removed target.
      if (step.allowsInteraction()) target.focus();
      else this.focusGuard.focus();
    }
    this.targetFocusedAtFreeze = false;
    this.syncControlState(step);
    this.syncShortcutLabels(step);
    this.moveToRetargetedRect(step, target);
    this.schedulePosition(this.generation);
  }

  /**
   * Walks the presentation from where it froze to the new target's box. The
   * per-frame loop can't do this on its own: it only tweens the cutout when
   * the step's own visuals changed, and a target that reappears elsewhere is
   * a pure geometry jump, which would snap. `animateTo` and the popover's
   * reposition both fall back to an instant move when the step isn't
   * animated, so this respects `animated: false` and reduced motion without
   * asking about them.
   */
  private moveToRetargetedRect(step: ActiveStep<T>, target: HTMLElement) {
    const generation = this.generation;
    const targetRect = presentationRect(step, target);
    this.observeDynamicOperation(
      this.overlay?.animateTo(targetRect, this.elementProps(step)),
      generation,
    );
    const placement = this.placePopover(targetRect, step, generation);
    if (this.isPointerEnabled(step)) {
      this.observeDynamicOperation(
        this.pointer?.moveToTarget(targetRect, step.props.get(), true, placement),
        generation,
      );
    }
    // Prime the loop with the box we are moving to, so the next frame doesn't
    // read it as a fresh change and snap over the animation just started.
    this.lastTargetRect = snapshotRect(targetRect);
    this.lastViewport = snapshotViewport(target);
  }

  private beginGeneration() {
    this.generation += 1;
    this.pendingCommand = null;
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

  /**
   * Starts the step's scroll and returns a promise that settles once the page
   * has stopped moving, or `null` when there is nothing to wait for — the step
   * opts out, the scroll was applied instantly, or no scroller can be measured.
   *
   * `scrollIntoView` is called synchronously so a throwing call still rejects
   * the `show()` that asked for it. Only the wait is deferred, which is what
   * lets the backdrop appear while the page is still travelling.
   */
  private beginTargetScroll(step: ActiveStep<T>, target: HTMLElement, signal: AbortSignal) {
    this.throwIfAborted(signal);

    if (step.detached || step.props.get().behavior?.autoScroll === false) return null;

    if (isInViewport(target.getBoundingClientRect(), target)) return null;
    const currentWindow = this.getWindow(target);
    if (!currentWindow) return null;
    const behavior = prefersReducedMotion(target)
      ? "instant"
      : (step.props.get().behavior?.scroll?.behavior ?? "smooth");
    target.scrollIntoView({
      behavior,
      block: step.props.get().behavior?.scroll?.block ?? "center",
      inline: step.props.get().behavior?.scroll?.inline ?? "nearest",
    });
    // An instant scroll has already landed by the time the call returns.
    if (behavior === "instant") return null;
    return this.waitForScrollToSettle(target, signal);
  }

  /**
   * Resolves once the scroller has held still for a couple of frames.
   *
   * Deliberately not the `scrollend` event: Safari only fires it from 18.2, so
   * older versions would fall through to the safety timeout on every step, and
   * the presentation would stay pinned to a stale position long after the page
   * actually stopped. Watching the offset costs a frame loop the browser is
   * already running during a smooth scroll, works everywhere, and settles just
   * as quickly when the browser decides there was nothing to scroll at all.
   *
   * Returns `null` when the offset cannot be read or frames cannot be
   * requested — there is then no way to observe the scroll, so callers treat it
   * as already finished rather than blocking on something unobservable.
   */
  private waitForScrollToSettle(target: HTMLElement, signal: AbortSignal) {
    const owner = ownerDocument(target);
    const scroller = owner?.scrollingElement;
    // Nothing to observe: a detached node, a server render, or a test double
    // with no scroll metrics. Read as "the scroll, if any, is over".
    if (typeof scroller?.scrollTop !== "number") return null;
    const frames = this.frameScheduler(target);
    if (!frames) return null;
    // A hidden document does not animate a smooth scroll, and throttles frames
    // to a couple a second, so watching one settle would stall the step until
    // the safety cap. Mirrors how element animations are force-finished while
    // the document is hidden.
    if (owner?.visibilityState === "hidden") return null;
    return new Promise<void>((resolve, reject) => {
      let frame: number | null = null;
      let timeout: ReturnType<typeof setTimeout> | null = null;
      let left = scroller.scrollLeft;
      let top = scroller.scrollTop;
      // Seeded below zero so the frames before the browser starts moving — the
      // scroller still sitting at its old offset — cannot read as "arrived".
      // Any real movement resets it to zero, where two still frames do mean it.
      let stillFrames = -SCROLL_SETTLE_GRACE_FRAMES;
      const finish = (error?: Error) => {
        if (frame !== null) frames.cancel(frame);
        if (timeout !== null) clearTimeout(timeout);
        signal.removeEventListener("abort", abort);
        owner?.removeEventListener("visibilitychange", stopIfHidden);
        if (this.cancelScroll === abort) this.cancelScroll = null;
        if (error) reject(error);
        else resolve();
      };
      const abort = () => finish(abortError());
      const stopIfHidden = () => {
        if (owner?.visibilityState === "hidden") finish();
      };
      const watch = () => {
        frame = null;
        const nextLeft = scroller.scrollLeft;
        const nextTop = scroller.scrollTop;
        const still =
          Math.abs(nextLeft - left) <= SCROLL_SETTLE_EPSILON &&
          Math.abs(nextTop - top) <= SCROLL_SETTLE_EPSILON;
        left = nextLeft;
        top = nextTop;
        stillFrames = still ? stillFrames + 1 : 0;
        if (stillFrames >= SCROLL_SETTLE_STILL_FRAMES) return finish();
        frame = frames.request(watch);
      };
      this.cancelScroll = abort;
      signal.addEventListener("abort", abort, { once: true });
      // A tab hidden mid-scroll stops animating it and throttles frames, so
      // stop watching rather than sit out the cap.
      owner?.addEventListener("visibilitychange", stopIfHidden);
      // Last resort, for a scroller that never comes to rest at all — a page
      // animating its own scroll, say. Not the normal path.
      timeout = setTimeout(finish, SCROLL_SETTLE_TIMEOUT);
      frame = frames.request(watch);
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

/**
 * The rect the presentation is placed against: the target's box, or an empty
 * rect at the center of the viewport for a detached step, which the overlay
 * draws without a cutout and the popover centers on.
 */
function presentationRect(step: { readonly detached?: boolean }, target: HTMLElement): DOMRect {
  if (!step.detached) return target.getBoundingClientRect();
  const viewport = viewportDimensions(target);
  // Only the box itself is read: the snapshot derives the rest from it.
  return { height: 0, left: viewport.width / 2, top: viewport.height / 2, width: 0 } as DOMRect;
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

interface ViewportSnapshot {
  height: number;
  width: number;
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

function snapshotViewport(context: Node): ViewportSnapshot {
  const viewport = viewportDimensions(context);
  return {
    height: finite(viewport.height),
    width: finite(viewport.width),
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

function sameViewport(left: ViewportSnapshot, right: ViewportSnapshot | null) {
  return right !== null && left.height === right.height && left.width === right.width;
}

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

/** Whether a keydown is Enter on a focused control, which activates it and is left to the browser. */
function activatesControl(event: KeyboardEvent, context?: Node | null) {
  const target = event.target;
  return (
    event.key === "Enter" && isHTMLElement(target, context) && target.matches(FOCUSABLE_SELECTOR)
  );
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
