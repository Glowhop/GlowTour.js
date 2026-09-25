# @glowhop/core-tour

## 1.5.0

### Minor Changes

- 781a1f7: Report the wait when a step's target is still resolving. A target given as an async resolver, or one the `"wait"` strategy is polling for, keeps the tour on the step the user asked to leave: for as long as that wait lasts, the popover on screen carries `data-glow-tour-awaiting-target` and its advance control is disabled, so a tour waiting on a slow target no longer looks idle with a button that does nothing. Both are cleared when the target settles, and `TourState` gains `awaitingTarget` so a UI that renders its own controls - every adapter's trigger components, and any custom one - can show the wait rather than read it from the DOM. Cancel and previous stay available, a target that resolves synchronously never enters this state, and the freeze of a target lost mid-step is unchanged.
- 91d778a: Add `tour.hidePopover()` and `tour.showPopover()`, also returned by `useGlowTour` and `injectGlowTour`. Hiding the popover keeps the overlay, the indicator and the scroll lock, and the tour keeps running: the page leaves `inert`, focus moves from the popover to the target, and the keyboard shortcuts do nothing until the popover is shown again. It stays hidden across steps, until `showPopover()` or the end of the tour, and a new `start()` shows it again. Showing it replays its entrance, makes the step modal again and moves focus back into it. `TourState` gains `popoverHidden`.
- d63e152: Step the popover aside while the user scrolls. The popover and the pointer used to chase the target through a fade every few pixels of travel, and settled in the middle of the screen once the target had scrolled out of view. They now fade out at the first scroll and come back once the page has been still for a moment, while the spotlight keeps following the target. When the user left part of the target outside the viewport, the step scrolls it back after the new `behavior.scroll.returnDelay` (500 ms by default, `false` to leave the page where the user put it); scrolling again restarts the wait, and a wheel or touch drag during the scroll back hands the page back. Steps with `allowScroll: false` or `autoScroll: false` do not scroll back.

### Patch Changes

- 2c568ab: Point each package's npm homepage to its page on glowtour.dev instead of the GitHub README, and describe what each package does in its npm description. Package metadata only: no code, API or export changes.
- f8259bd: Keep the tour aligned on a phone page that is wider than the device and can be zoomed out. The browser then grows the layout viewport past the initial containing block: the overlay stopped short of the bottom of the screen, leaving an undimmed band, and the popover was placed and clamped against the smaller device-width box. The overlay now spans the taller of `100%` and `100lvh`, and placement measures the box `position: fixed` elements actually use.

## 1.4.0

### Minor Changes

- b838fb5: Move `allowScroll` into the step behavior.
  
  **Breaking changes**
  
  - `StartOptions.allowScroll` and the `allowScroll` key of a JSON config are removed: use `behavior.allowScroll`. The workflow `behavior` still applies it to every step.
  
  **Added**
  
  - `behavior.allowScroll` can be set per step, and `context.props.update({ behavior: { allowScroll } })` locks or releases page scroll at once while the step is shown.
- cdd1efc: Make `behavior.autoFocus: false` never move focus during a step. It used to keep focus only when it was already in the popover, and moved it onto the Advance button otherwise, which is where almost every step starts.
  
  **Breaking changes**
  
  - With `autoFocus: false`, focus the page lost, such as the button that started the tour once a modal step makes the page inert, now stays on the body instead of moving onto the Advance or Previous button. Move it yourself once the step is shown if it needs to be somewhere.
  - With `autoFocus: false`, focus is no longer pulled back into the popover when the focused target is removed, or when `allowInteraction` is turned off while the target has focus.
  
  **Added**
  
  - With `autoFocus: false` on a step that allows interaction, focus now stays wherever it is on the page, so a user filling in a form the tour walks them through keeps typing in their field.
  
  The focus trap and the focus restoration at the end of the tour are unchanged.
- 8186981: Make step behavior part of the dynamic step props.
  
  **Breaking changes**
  
  - `WorkflowStepDefinition.behavior` is removed: the step behavior now lives in `props.behavior`, merged over the workflow `behavior` defaults like the other options.
  - `props.set()` replaces `behavior` along with the other props: spread the current props to keep it.
  
  **Added**
  
  - `context.props.update({ behavior })` changes the step behavior while the tour runs, and the value appears in `state.currentStep.currentProps.behavior`. `allowInteraction` applies at once (modality, focus, indicator fade), `overlayClick` on the next click, `autoFocus` / `autoScroll` / `scroll` on the next entry, and `missingTarget` on the next target resolution.
  - `props.set()` and `props.update()` validate `behavior`, like the other options.
- 59b4c73: Use the same component names in every adapter.
  
  **Breaking changes**
  
  - React and Solid: every component takes the `GlowTour` prefix (`GlowTourRoot`, `GlowTourPopover`, `GlowTourHeader`, `GlowTourContent`, `GlowTourFooter`, `GlowTourOverlay`, `GlowTourPointer`, `GlowTourAdvanceTrigger`, `GlowTourCancelTrigger`), `DefaultTour` becomes `GlowTourDefault` and `DefaultTourProps` becomes `GlowTourDefaultProps`.
  - All adapters: the back trigger becomes the previous trigger. `BackTrigger` / `GlowTourBackTrigger` become `GlowTourPreviousTrigger`, the Angular selector and Vanilla tag `glow-tour-back-trigger` become `glow-tour-previous-trigger`, and the `backLabel` prop (Vanilla `back-label` attribute) becomes `previousLabel` (`previous-label`).
  - The default label of the previous trigger is "Previous step" instead of "Back step".
  - Vanilla: `createDefaultTourElement()` and `CreateDefaultTourElementOptions` are removed. Use the `<glow-tour-default>` element, with its `tour` property and `id-prefix` attribute. The `VanillaGlowTour` type alias is removed: use `Tour`.
  
  **Added**
  
  - Vanilla `<glow-tour-default>` element and `GlowTourDefaultElement` type, registered with the other elements.
- 89f2b09: Align the JSON config with the builder names and version its format.
  
  - A workflow config carries `version: "1.1"`.
  - Step config keys follow the builder: `beforeEnter`, `beforeLeave`, and `targetEvents` (entries keep `event` and `action`).
  - `TargetEventConfig` replaces `EventHandlerConfig`, and the core `TargetEventHandler` type replaces `EventHandler`.
- e7b9c52: Designate steps by id when jumping to them.
  
  **Breaking changes**
  
  - `tour.goToStep(index)` is removed. Use `tour.goTo(id)` with the step's `id`, like `startAt` in `start()`: an index breaks as soon as steps are reordered or inserted.
  
  **Added**
  
  - `tour.goTo(id)` goes to the step with this id, skipping the steps in between. It does nothing while a transition is in progress or when that step is already shown, and throws when no step has this id.
  - `context.goTo(id)` in step actions and target event handlers. Like `context.advance()`, it stops the remaining actions of the step. An unknown id fails the tour with `tour:error`.
- a0963a1: GlowTour.js 1.4 contains breaking changes: old names are removed, not deprecated. Upgrade every `@glowhop/*` package together and follow the migration guide, which lists every change with the code to update: https://glowtour.dev/docs/migration/1-4
- 3072d88: Add the `"detached"` missing-target strategy.
  
  **Added**
  
  - `behavior.missingTarget.strategy: "detached"` shows a step whose target is not found with its popover centered in the viewport, over a backdrop that covers the whole screen. It applies as soon as the target is missing, and also when a target disappears for good while its step is on screen.
  - A detached step has no cutout and no pointer, does not scroll, and keeps the page blocked even when `allowInteraction` is `true`. Its `targetEvents` are not bound, and `context.target` is the document's `<body>`.
  - The JSON config accepts `"detached"`.
- 337378c: Reshape the step options around positive booleans and grouped behavior settings.
  
  **Breaking changes**
  
  - `behavior.disableAutoFocus` and `behavior.disableAutoScroll` are replaced by `behavior.autoFocus` and `behavior.autoScroll`, which default to `true`: `disableAutoFocus: true` becomes `autoFocus: false`.
  - `indicator.disabled` and `popover.arrow.disabled` are renamed to `indicator.hidden` and `popover.arrow.hidden`.
  - `popover.arrow.disableAutoStyles` is replaced by `popover.arrow.autoStyles`, which defaults to `true`: `disableAutoStyles: true` becomes `autoStyles: false`.
  - `popover.keyboardShortcuts` moves to the root `controls` option: `keyboardShortcuts: { advance: ["n"] }` becomes `controls: { advance: { keys: ["n"] } }`.
  - `behavior.missingTargetStrategy` and `behavior.targetTimeout` are grouped into `behavior.missingTarget: { strategy, timeout }`.
  - The JSON config follows the same shapes and rejects the old keys.
  
  **Added**
  
  - `MissingTargetOptions` type.
- 5d53fcc: Make the step `title` optional.
  
  **Added**
  
  - `title` can be left out of a step, in the builder and in the JSON config. Without a title, the header is not rendered, the popover dialog takes its accessible name from the content, and `aria-describedby` is removed so the content is not announced twice.
  - A header you compose yourself follows the same rule: it renders nothing, or is hidden in the vanilla adapter, while the step has no title.
- 3e7ae77: Replace the popover button flags and keyboard shortcuts with a root `controls` option.
  
  **Breaking changes**
  
  - `popover.hideFooter`, `popover.hideAdvanceButton`, `popover.hidePreviousButton`, `popover.disableAdvanceButton` and `popover.disablePreviousButton` are removed. Set the `state` of `controls.advance`, `controls.previous` or `controls.cancel` to `"enabled"` or `"disabled"` instead: `disableAdvanceButton: true` becomes `controls: { advance: { state: "disabled" } }`. To hide a button, give it a class through `classNames` and hide that class in your CSS: `hideAdvanceButton: true` becomes `classNames: { advance: "tour-hidden" }`, and `hideFooter: true` becomes `classNames: { footer: "tour-hidden" }`.
  - The keys that run each command sit next to its state, in `controls.<command>.keys`. A step's controls override the workflow ones field by field, so a step setting only `advance.state` keeps the workflow's `advance.keys`.
  - A disabled control blocks its button, its keys and `overlayClick`. A button hidden through `classNames` keeps its keys, like `hideAdvanceButton` did; disable the control to block them too.
  - The footer is always rendered, in the footer component and in the default tour component.
  - The JSON config follows the same shape and rejects the old keys.
  
  **Added**
  
  - `controls.cancel.state` disables the cancel button, with its keys and `overlayClick: "cancel"`. `tour.cancel()` keeps working.
  - `TourControls`, `TourControl` and `TourControlState` types.
- 3a74415: Remove the `cancellable` start option: the cancel control replaces it.
  
  **Breaking changes**
  
  - `cancellable` is removed from the start options and from the JSON config, which rejects it. To keep the user from ending a tour, set `controls: { cancel: { state: "disabled" } }` on the workflow: the Skip button is disabled, and `Escape` and `overlayClick: "cancel"` do nothing. To hide the button as well, give it a class through `classNames.cancel`.
  - `tour.cancel()` and `context.cancel()` always cancel a running tour. `cancellable: false` used to ignore them.
  - A step whose target disappears, with no step left to fall back to, always cancels the tour. With `cancellable: false` it used to fail with a missing-target error.
  - The Skip button is always rendered, like the Previous and Advance buttons, and is disabled when the tour cannot be cancelled. It used to be removed.
- b933de7: Rename `tour.run(workflow)` to `tour.start(workflow)`.
  
  **Breaking changes**
  
  - All adapters: `tour.run(workflow, options?)` becomes `tour.start(workflow, options?)`, with the same arguments and the same promise. The value returned by `useGlowTour()` and `injectGlowTour()` exposes `start` instead of `run`.
- ecf9259: Add `classNames` to style a tour component on a given step.
  
  **Added**
  
  - `classNames` on the workflow options and on each step, in the builder and in the JSON config. It takes one entry per component (`overlay`, `popover`, `pointer`, `header`, `content`, `footer`, `previous`, `advance`, `cancel`), each a string or an array of strings.
  - The classes are added after the classes given to the component itself, which are never replaced. A step's entry overrides the workflow entry for the same component, and the components the step leaves out keep the workflow classes.
  - `context.props.update({ classNames })` changes the classes of the components it names during the step. Use the function form to add or remove a single class.
  - `ClassValue` and `TourClassNames` types.
- 8f37579: Replace the step transition hooks with `beforeEnter` / `beforeLeave`, and stop resetting step props automatically.
  
  **Breaking changes**
  
  - Step props are no longer reset when the tour enters a step. A value set with `context.props.set()` is kept when the tour comes back to that step, until the workflow runs again. `resetPropsOnEnter` is removed from `StepParameters` and from the JSON `StepConfig`.
  - `beforeAdvance()`, `beforePrevious()`, and `beforeCancel()` are removed from the step builder, along with the `BeforeActionStepContext` and `StepTransitionAction` types.
  - JSON config: `advanceAction`, `previousAction`, `cancelAction`, and `resetPropsOnEnter` are no longer accepted and are reported as unknown step keys. `TransitionActionRef` is replaced by `StepHookActionRef` in `@glowhop/core-tour/config` and in every adapter's `/config` entry point.
  
  **Added**
  
  - `.beforeEnter(callback)` runs each time a step is entered, after its target is resolved and before the step is shown, so the props it sets are the first ones rendered. It does not run for a step skipped by `missingTarget: { strategy: "skip" }`.
  - `.beforeLeave(callback)` runs before `advance()`, `previous()`, `goTo()`, or finishing the tour. It never runs on cancel.
  - Both hooks receive a `StepHookContext` (`props`, `initialProps`, `target`, `signal`, `direction`) without navigation methods. JSON config: `beforeEnter` / `beforeLeave`.
  - `context.props.update(patch)` merges a partial change into the step props, instead of spreading every level by hand: `props.update({ controls: { advance: { state: "enabled" } } })`. `data` is merged key by key, `overlay` / `popover` / `indicator` / `behavior` / `controls` are merged like step options over workflow defaults, and arrays are replaced. It also accepts a function of the current props.
  - `StepContext` (actions and target event handlers) now exposes `initialProps` and `direction`, the direction of the navigation that entered the step.
  
  **Migration**
  
  - To keep resetting props on every visit:
  
    ```ts
    .beforeEnter(({ props, initialProps }) => props.set(initialProps))
    ```
  
  - Remove `resetPropsOnEnter: false`: not resetting is now the default.
  - Replace `beforeAdvance(fn)` with `beforeLeave((context) => { if (context.direction === "advance") return fn(context); })`, and `beforePrevious(fn)` the same way with `"previous"`. The hook context no longer spreads the step props: read them with `context.props.get()`.
  - Move `beforeCancel(fn)` to the workflow `onCancel` option, which receives a snapshot of the current step (`context.step`), or clean up from a step action with `context.signal`.
  - JSON config: replace `advanceAction` / `previousAction` with `beforeLeave` (branch on `direction`) and `cancelAction` with the workflow `onCancel`.
- 82b913a: Let step hooks stop a navigation, report skipped steps, and emit each transition's events once.
  
  **Breaking changes**
  
  - Going back over steps skipped for a missing target no longer cancels the tour when it runs past the first step: the tour stays on the step it was on.
  - `tour:start` is emitted once the first step's `beforeEnter` has passed, instead of right after `onStart`. A start that this `beforeEnter` aborts emits no event at all.
  - A navigation that skips several steps emits a single `step:leave` for the step being left, instead of repeating it for every skipped step.
  - `StepHookContext` is now an interface with an `abort()` method.
  
  **Added**
  
  - `abort()` in `beforeEnter` and `beforeLeave` stops the navigation: the tour stays on its current step and emits nothing. When the first step's `beforeEnter` aborts, the tour goes back to `idle`, like an `onStart` abort. Called after the hook has settled, it has no effect.
  - `step:skip` monitoring event, emitted for each step passed over by `missingTarget: { strategy: "skip" }`.
  
  **Event order**
  
  A navigation emits `step:skip` for each skipped step, then `step:leave` for the step being left, then `step:enter` for the step shown.

### Patch Changes

- c184788: Announce step changes to screen readers. Between two steps the popover was hidden from assistive technology (`aria-hidden` and `inert`) while its content changed, so the live region never announced the new step and focus left the dialog. The popover now stays exposed while it fades between steps, and is only hidden when the tour ends. Pointer input is still blocked during the fade, as before.
- 3606daf: Clear the previous tour when `start()` replaces it and the new start is aborted. An `onStart` hook, the first step's `beforeEnter`, or the `onFinish` hook of a workflow without steps calling `abort()` returned the tour to `idle` while the replaced tour's overlay and popover stayed on screen and the page stayed inert.
- 87bbca0: Make Enter activate the focused tour button. Enter was always read as the advance shortcut, so pressing it on a focused Back button moved forward and on Skip finished the tour; it now clicks that button like Space or a pointer does, so the button's own command runs after the consumer's `onClick`, which can prevent it, and the event `source` is `"trigger"`. Enter on other controls in the popover content is left to the browser. Going back onto a step whose Back button is unavailable, such as the first one, now focuses Advance instead of leaving focus on an unavailable control.
- 560f8e4: Restore focus to the element that started the tour when its first step is modal. Making the rest of the page inert blurred that element before the focus guard remembered it, so focus fell back to the document body when the tour ended, in every adapter.
- 293dc16: Keep screen readers on track when a modal step opens or the tour ends. The rest of the page now becomes inert, and the popover is marked `aria-modal`, as focus moves into the presented popover rather than at the start of the transition, like a native modal dialog. When the tour ends, focus returns to the element that started it once the popover has faded out, so screen readers announce it.

## 1.3.1

## 1.3.0

### Minor Changes

- b38bc4a: Present a step while its scroll is still in flight.
  
  Entering a step whose target was off screen used to stall: the tour waited for
  the smooth scroll to finish before initialising anything, so the previous step's
  elements sat frozen for the whole journey and everything then snapped into place
  at once. On Safari before 18.2, where `scrollend` does not exist, that wait was a
  full second on every step.
  
  The scroll now runs alongside the presentation. The spotlight appears
  immediately and tracks the target as the page travels; the popover and the
  pointer enter once the page has come to rest, on a rect that will not move
  again. When a step scrolls, the spotlight moves with the page rather than
  morphing from the previous step's cutout; steps that do not scroll keep the
  morph.
  
  Scroll completion is detected by watching the scroller hold still rather than by
  listening for `scrollend`, so every engine behaves the same. A hidden document,
  which neither animates a smooth scroll nor runs frames often enough to watch one
  settle, does not wait at all.
  
  When a step scrolls is unchanged: only when part of its target falls outside the
  viewport, and never when `disableAutoScroll` is set.
  
  Two smaller behaviour changes fall out of this. The pointer now arrives together
  with the popover rather than with the spotlight, since its placement is resolved
  against the popover's. And a target lost while its step is still scrolling no
  longer freezes the presentation, because a freeze in that window could never be
  recovered.

## 1.2.0

### Minor Changes

- 3058e3d: When a step's target is removed from the DOM while its step is showing, the tour now freezes the presentation in place for a short grace period and resumes on the target without a re-entrance animation if it reconnects, instead of immediately unmounting and replaying the appear animation. When the target reappears somewhere else, the cutout is animated to its new box rather than snapping, unless the step opts out of animation. Interaction with the underlying page stays blocked during the freeze even when `allowInteraction` is `true`. If the target doesn't come back within the grace period, `missingTargetStrategy` and `targetTimeout` apply exactly as before — the grace period counts against `targetTimeout` rather than extending it. Under `wait` the presentation stays frozen and the tour stays `active` for the whole budget, so the popover's buttons keep working instead of going dead behind a `transitioning` status.

## 1.1.0

### Minor Changes

- 165797b: `allowScroll` now defaults to `true`: the page stays scrollable while a tour runs. Pass `allowScroll: false` to keep the previous scroll-lock behaviour.

## 1.0.2

### Patch Changes

- 5aa8cdf: Fix two mobile overlay defects.
  
  The backdrop no longer stops short of the bottom of the screen. Its `viewBox` is
  now measured from the element's own box instead of `documentElement.clientHeight`,
  which a retracting mobile URL bar moves out of step with the box a fixed element
  is sized against; `preserveAspectRatio="xMinYMin slice"` makes any residual mismatch
  overdraw rather than letterbox, and the element is sized to `100lvh` where that
  unit exists so it always spans the visible area.
  
  The cutout now animates on WebKit. Safari — and therefore every browser on iOS —
  cannot animate `d` through the Web Animations API, so the rectangle is
  interpolated frame by frame and the path regenerated from it, clocked by the
  eased progress of the animation already running on the same element, instead of
  snapping to each target.

## 1.0.1

### Patch Changes

- 358c4b1: Draw the overlay backdrop on WebKit. The cutout geometry was only written to the CSS `d` property, which Safari does not implement — so on macOS Safari and on every iOS browser (Chrome and Firefox included, both WebKit) the backdrop never drew and tours ran with a popover but no dimming. The `d` attribute is now the source of truth, with the CSS property mirrored where it exists so the cutout still morphs between steps.
  
  Measure the viewport as the layout viewport (`documentElement.clientWidth/clientHeight`) instead of `innerWidth`/`innerHeight`. The latter reports the visual viewport, which shrinks with a mobile URL bar and includes a classic desktop scrollbar; the resulting mismatch with the overlay's own `100%`-sized box scaled and centred the backdrop, leaving undimmed bands and a cutout offset from its target. The same measurement backs popover clamping and the pointer's in-viewport checks.

## 1.0.0

### Major Changes

- e6da5bf: GlowTour.js V.1.0.0 release
