# @glowhop/vue-tour

## 1.4.0

### Minor Changes

- b838fb5: Move `allowScroll` into the step behavior.
  
  **Breaking changes**
  
  - `StartOptions.allowScroll` and the `allowScroll` key of a JSON config are removed: use `behavior.allowScroll`. The workflow `behavior` still applies it to every step.
  
  **Added**
  
  - `behavior.allowScroll` can be set per step, and `context.props.update({ behavior: { allowScroll } })` locks or releases page scroll at once while the step is shown.
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
- 45b6f18: Compose a tour with the `GlowTour` object.
  
  **Added**
  
  - React, Solid and Vue export a `GlowTour` object with the composition components without their prefix: `GlowTour.Root`, `GlowTour.Overlay`, `GlowTour.Pointer`, `GlowTour.Popover`, `GlowTour.Header`, `GlowTour.Content`, `GlowTour.Footer`, `GlowTour.AdvanceTrigger`, `GlowTour.PreviousTrigger` and `GlowTour.CancelTrigger`. It allows `<GlowTour.Root>` markup in JSX and in Vue `<script setup>` templates. `GlowTourDefault` is not part of it. The `GlowTour*` named exports are unchanged, and a bundle that does not use the object does not include it.
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
- 61242d6: Run a tour from a component with `useGlowTour()`.
  
  **Breaking changes**
  
  - React, Vue, and Solid: `useTour()` becomes `useGlowTourContext()`. It still reads the state of the enclosing `GlowTourRoot`.
  - Angular: `injectGlowTour()` becomes `injectGlowTourContext()`. The `injectGlowTour` name now belongs to the new API below and returns a different shape.
  
  **Added**
  
  - `useGlowTour(source?)` in React, Vue, and Solid, and `injectGlowTour(source?)` in Angular. They return the tour, its methods (`create`, `start`, `advance`, `previous`, `goTo`, `cancel`), and each state field in the framework's reactive form: values in React, refs in Vue, accessors in Solid, signals in Angular. Called with options, they create a tour; Vue, Solid, and Angular dispose it with the component. Called with an existing tour, they share it and never dispose it.
  - `UseGlowTourResult` and `InjectGlowTourResult` types.

### Patch Changes

- bf6ecc0: Only let tour state disable a trigger while the tour is active, as the vanilla and Angular adapters already do. The React, Vue and Solid triggers were also natively disabled outside of it, so a start replacing the tour on screen disabled the focused trigger during its `onStart` and blurred it. A step's `controls.<command>.state: "disabled"` still disables its trigger at any time.
- Updated dependencies [b838fb5]
- Updated dependencies [c184788]
- Updated dependencies [cdd1efc]
- Updated dependencies [8186981]
- Updated dependencies [3606daf]
- Updated dependencies [59b4c73]
- Updated dependencies [89f2b09]
- Updated dependencies [87bbca0]
- Updated dependencies [e7b9c52]
- Updated dependencies [a0963a1]
- Updated dependencies [3072d88]
- Updated dependencies [337378c]
- Updated dependencies [5d53fcc]
- Updated dependencies [3e7ae77]
- Updated dependencies [3a74415]
- Updated dependencies [560f8e4]
- Updated dependencies [293dc16]
- Updated dependencies [b933de7]
- Updated dependencies [ecf9259]
- Updated dependencies [8f37579]
- Updated dependencies [82b913a]
  - @glowhop/core-tour@1.4.0

## 1.3.1

### Patch Changes

- @glowhop/core-tour@1.3.1

## 1.3.0

### Patch Changes

- Updated dependencies [b38bc4a]
  - @glowhop/core-tour@1.3.0

## 1.2.0

### Patch Changes

- Updated dependencies [3058e3d]
  - @glowhop/core-tour@1.2.0

## 1.1.0

### Patch Changes

- Updated dependencies [165797b]
  - @glowhop/core-tour@1.1.0

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
- Updated dependencies [5aa8cdf]
  - @glowhop/core-tour@1.0.2

## 1.0.1

### Patch Changes

- Updated dependencies [358c4b1]
  - @glowhop/core-tour@1.0.1

## 1.0.0

### Major Changes

- e6da5bf: GlowTour.js V.1.0.0 release

### Patch Changes

- Updated dependencies [e6da5bf]
  - @glowhop/core-tour@1.0.0
