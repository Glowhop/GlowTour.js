---
title: Builder API reference
description: Complete reference for the GlowTour.js workflow/step builder and all available options with their defaults.
---

`tour.create()` returns a workflow builder: chain `.step()`, `.do()`, `.wait()`, and the other methods below to describe a tour, then call `.build()` to get an immutable `WorkflowDefinition`. For the controller that runs the resulting workflow (`createGlowTour`, `tour.start`, `tour.advance`, `tour.state`, …), see the [Tour reference](/docs/reference/tour).

For framework-specific integration and components, see [React](/docs/reference/react), [Vue](/docs/reference/vue), [Solid](/docs/reference/solid), [Angular](/docs/reference/angular), or [Vanilla](/docs/reference/vanilla).

## Main functions

### `tour.create(name, options?)`

Starts building a new workflow.

**Signature**:
```typescript
create(name: string, options?: StartOptions): WorkflowBuilder
```

**Parameters**:
- `name` - Workflow identifier
- `options` - Start options (see [Start options](#start-options))

**Returns**: Workflow builder for chaining

**Usage**:
```typescript
const workflow = tour
  .create("onboarding", {
    cancellable: true,
    onStart: () => console.log("Tour started"),
    onFinish: () => console.log("Tour finished")
  })
  .step({ id: "step-1", /* ... */ })
  .build();
```

### `.step(params)`

Adds a step to the workflow.

**Signature**:
```typescript
step(params: StepParameters): WorkflowStepBuilder
```

**Parameters**:
- `id` - Stable identifier, unique within the workflow (required). Validated at `.build()` time. It is what [`start(workflow, { startAt })`](/docs/guides/resuming) uses to resume a tour, so prefer a name that survives reordering.
- `target` - CSS selector, HTMLElement, or resolver function (required)
- `title` - Step title displayed in the popover header (optional: without a title, the header is omitted and the content names the dialog)
- `content` - Step description displayed in popover (required)
- `data` - Optional record for custom step data
- `overlay` - Overlay options (see [Overlay options](#overlay-options))
- `popover` - Popover options (see [Popover options](#popover-options))
- `indicator` - Indicator options (see [Indicator options](#indicator-options))
- `behavior` - Behavior options (see [Behavior options](#behavior-options))
- `controls` - State and keys of the advance, previous and cancel commands (see [Controls options](#controls-options))
- `classNames` - Classes added to the tour components on this step (see [Class name options](#class-name-options))

**Usage**:
```typescript
.step({
  id: "feature",
  target: "#feature",
  title: "Meet the new feature",
  content: "This will help you be more productive",
  overlay: { opacity: 0.6 },
  popover: { placementTryOrder: ["bottom", "top"] }
})
```

### Step actions

`.do()`, `.wait()`, `.waitUntil()`, `.waitUntilElement()`, `.clickTarget()`, and `.focusTarget()` add actions to the step they are chained after. Once that step is on screen, its actions run in order. Leaving the step, or cancelling the tour, aborts the remaining actions through `context.signal`.

### `.do(callback)`

Adds a custom action. Can be async. Returning `false` stops the rest of the step's action sequence; any other value continues it.

**Signature**:
```typescript
do(callback: StepAction<T>): WorkflowStepBuilder<T>

type StepAction<T> = (
  context: StepContext<T>,
) => Promise<boolean | void> | boolean | void
```

`StepContext<T>` exposes `target`, `props`, `initialProps`, `direction`, `signal`, and the navigation methods `advance()`, `previous()`, `goTo(id)`, and `cancel()`.

**Usage**:
```typescript
.step({
  id: "loading",
  target: "#results",
  title: "Loading results",
  content: "Fetching your data..."
})
.do(async ({ props, signal }) => {
  await fetchData({ signal });
  props.update({ content: "Data is now available" });
})
```

### `.wait(ms)`

Adds a fixed delay to the step's actions.

**Signature**:
```typescript
wait(ms: number): WorkflowStepBuilder<T>
```

Throws a `TypeError` when `ms` is not a finite, non-negative number.

**Usage**:
```typescript
.step({ id: "step-4", /* ... */ })
.wait(2000)  // Wait 2 seconds, then run the next action
.do(({ advance }) => advance())
```

### `.waitUntil(predicate, options?)`

Adds an action that waits until a condition is met. The predicate can be async and receives the step context. The action rejects with a timeout error when the condition is still not met after `timeout`.

**Signature**:
```typescript
waitUntil(
  predicate: (context: StepContext<T>) => Promise<boolean> | boolean,
  options?: WaitUntilOptions
): WorkflowStepBuilder<T>
```

**Parameters**:
- `predicate` - Condition that returns (or resolves to) `true` when ready
- `options` - Wait options (see [Wait options](#wait-options))

**Usage**:
```typescript
.step({
  id: "upload",
  target: "#upload",
  title: "Upload a file",
  content: "Drop a file here to continue"
})
.waitUntil(({ target }) => target.classList.contains("is-complete"), {
  interval: 100,
  timeout: 30000
})
.do(({ advance }) => advance())
```

### `.waitUntilElement(selector, options?)`

Adds an action that waits until an element matching `selector` exists in the target's document. Throws a `TypeError` when `selector` is empty.

**Signature**:
```typescript
waitUntilElement(
  selector: string,
  options?: WaitUntilOptions
): WorkflowStepBuilder<T>
```

**Parameters**:
- `selector` - CSS selector to wait for
- `options` - Wait options (see [Wait options](#wait-options))

**Usage**:
```typescript
.step({
  id: "open-modal",
  target: "#open-modal",
  title: "Open the modal",
  content: "Click this button"
})
.waitUntilElement("#modal", { timeout: 10000 })
.do(({ advance }) => advance())
.step({
  id: "modal",
  target: "#modal",
  title: "Modal opened",
  content: "The modal is now visible"
})
```

### `.clickTarget()`

Adds an action that calls `click()` on the step's target.

**Signature**:
```typescript
clickTarget(): WorkflowStepBuilder<T>
```

**Usage**:
```typescript
.step({ id: "menu", target: "#menu-button", title: "Menu", content: "The menu opens for you" })
.clickTarget()
```

### `.focusTarget()`

Adds an action that calls `focus()` on the step's target.

**Signature**:
```typescript
focusTarget(): WorkflowStepBuilder<T>
```

**Usage**:
```typescript
.step({ id: "search", target: "#search", title: "Search", content: "Type a query" })
.focusTarget()
```

### `.append(workflow)`

Copies every step of another workflow, with its actions, hooks, and target events, after the current step. The appended workflow's start options (`onStart`, `cancellable`, …) are not copied. Returns the builder of the last appended step, so it can be configured further. Throws when `workflow` has no steps.

**Signature**:
```typescript
append(workflow: WorkflowDefinition<T>): WorkflowStepBuilder<T>
```

**Usage**:
```typescript
const intro = tour.create("intro").step({ id: "welcome", /* ... */ }).build();

const workflow = tour
  .create("onboarding")
  .append(intro)
  .step({ id: "settings", /* ... */ })
  .build();
```

Step ids must stay unique in the resulting workflow.

### `.onTargetEvent(event, callback)`

Listens for a DOM event on the current target during this step.

**Signature**:
```typescript
// A known DOM event name, narrowed to its concrete event type.
onTargetEvent<TEventName extends EventName>(
  event: TEventName,
  callback: Callback<EventForName<TEventName>>
): WorkflowStepBuilder

// Several event names at once, sharing one callback.
onTargetEvent<TEventNames extends readonly EventName[]>(
  events: TEventNames,
  callback: Callback<EventForName<TEventNames[number]>>
): WorkflowStepBuilder

// A custom event name, with the event type supplied by you.
onTargetEvent<TEvent extends Event>(
  event: string,
  callback: Callback<TEvent>
): WorkflowStepBuilder

type Callback<TEvent> = (
  event: TEvent,
  context: StepEventContext<T>,
) => void | Promise<void>
```

**Usage**:
```typescript
.step({
  id: "form",
  target: "#form",
  title: "Submit the form",
  content: "Click the submit button"
})
.onTargetEvent("submit", (event, context) => {
  console.log("Form submitted!");
  context.advance();
})
```

### `.build()`

Finalizes and returns the immutable workflow definition.

**Signature**:
```typescript
build(): WorkflowDefinition
```

**Returns**: Immutable workflow ready for execution

**Usage**:
```typescript
const workflow = tour
  .create("onboarding")
  .step({
    id: "welcome",
    target: "#welcome",
    title: "Welcome",
    content: "Let's get started"
  })
  .build();
```

### `.beforeEnter(callback)`

Runs each time the step is entered, after its target is resolved and before the step is shown. Can be async: the step is not shown until it resolves. A step skipped by `missingTarget: { strategy: "skip" }` never runs it; a step shown with `"detached"` runs it with the document's `<body>` as `context.target`. Call `context.abort()` to stay on the current step instead: nothing is shown and no event is emitted, and when it is the first step of `start()`, the tour goes back to `idle`.

Step props are not reset automatically: a value set with `context.props.set()` is still there when the tour comes back to the step, until the workflow runs again. `beforeEnter` is where to reset them, because what it sets is what the step renders first.

**Signature**:
```typescript
beforeEnter(callback: StepHookAction<T>): WorkflowStepBuilder

type StepHookAction<T> = (context: StepHookContext<T>) => void | Promise<void>
```

`StepHookContext<T>` carries `props`, `initialProps`, `target`, `signal`, `direction`, the direction of the navigation in progress (`"advance"` or `"previous"`), and `abort()`, which stops that navigation when called synchronously or before the hook's promise resolves. It has no `advance`, `previous`, or `cancel`: a transition is already in progress.

**Usage**:
```typescript
.step({ id: "checkout", target: "#checkout", title: "Checkout", content: "Fill in the form" })
// Start from the declared props on every visit
.beforeEnter(({ props, initialProps }) => props.set(initialProps))

// Or reset only part of them
.beforeEnter(({ props, initialProps }) =>
  props.set((current) => ({ ...current, data: initialProps.data })),
)
```

### `.beforeLeave(callback)`

Runs before the tour navigates away from the step: `advance()`, `previous()`, `goTo()`, or advancing past the last step to finish. Can be async: the navigation waits for it. It does not run on cancel; use the workflow's `onCancel` option, which receives the current step.

**Signature**:
```typescript
beforeLeave(callback: StepHookAction<T>): WorkflowStepBuilder
```

It receives the same `StepHookContext<T>`. `direction` is the direction of the navigation in progress, so the step being left and the step being entered see the same value. Branch on it to react to one direction only. Call `context.abort()` to keep the tour on this step: the navigation stops, and finishing is prevented when this is the last step.

**Usage**:
```typescript
.step({ id: "form", target: "#form", title: "Your details", content: "Fill in the form" })
.beforeLeave(async ({ direction }) => {
  if (direction === "advance") await saveFormData();
})
```

## Option reference

### Start options

Options passed to `tour.create()` to configure the initial workflow behavior.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cancellable` | boolean | `true` | Whether the tour can be cancelled by the user |
| `animated` | boolean | `true`* | Enable animations (auto-disabled if OS prefers reduced motion) |
| `overlay` | OverlayOptions | - | Overlay appearance (see [Overlay options](#overlay-options)) |
| `popover` | PopoverOptions | - | Popover appearance (see [Popover options](#popover-options)) |
| `indicator` | IndicatorOptions | - | Indicator appearance (see [Indicator options](#indicator-options)) |
| `behavior` | StepBehavior | - | Step behavior (see [Behavior options](#behavior-options)) |
| `controls` | TourControls | - | State and keys of the navigation commands on every step, unless a step overrides them (see [Controls options](#controls-options)) |
| `classNames` | TourClassNames | - | Classes added to the tour components on every step, unless a step sets its own for the same component (see [Class name options](#class-name-options)) |
| `onStart` | `(context: LifecycleHookContext) => void \| Promise<void>` | - | Called when the tour starts |
| `onCancel` | `(context: LifecycleHookContext) => void \| Promise<void>` | - | Called when the tour is cancelled |
| `onFinish` | `(context: LifecycleHookContext) => void \| Promise<void>` | - | Called when the tour completes |
| `onEvent` | `(event: TourEvent) => void` | - | Monitoring callback for this workflow. Cannot abort a transition; see the [Monitoring guide](/docs/guides/monitoring) |

*Animations automatically disable when the browser detects `prefers-reduced-motion`.

### Overlay options

Control the semi-transparent overlay that darkens non-target areas.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `color` | string | - | Overlay color (uses theme's overlay fill if not set) |
| `opacity` | number | `0.7` | Overlay opacity (0 = transparent, 1 = opaque) |
| `padding` | number | `8` | Padding around the target element (in pixels) |
| `radius` | number | `8` | Border radius of the overlay cutout (in pixels) |
| `animated` | boolean | `true` | Enable/disable animation |
| `animation` | AnimationOptions | - | Custom animation (duration and easing) |

**Usage**:
```typescript
overlay: {
  color: "rgba(0, 0, 0, 0.5)",
  opacity: 0.6,
  padding: 20,
  radius: 8,
  animated: true
}
```

### Popover options

Control the information box that displays step title and content.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `placementTryOrder` | Array | `["bottom", "top", "right", "left"]` | Preferred placements in order of preference |
| `gap` | number | `16` | Spacing between popover and target, and the minimum margin it keeps from the viewport edges (in pixels) |
| `animated` | boolean | `true` | Enable/disable animation |
| `animation` | AnimationOptions | - | Custom animation (duration and easing) |
| `arrow` | PopoverArrowOptions | - | Popover arrow, the small triangle attached to the popover (see [Arrow options](#arrow-options)). The pointer indicator is configured with `indicator` |

**Usage**:
```typescript
popover: {
  placementTryOrder: ["right", "bottom", "left", "top"],
  gap: 20
}
```

### Arrow options

Customize the arrow that points from the popover to the target element.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hidden` | boolean | `false` | Hide the arrow |
| `color` | string | - | Arrow color (uses theme's surface color if not set) |
| `size` | number | `12` | Arrow dimensions (in pixels) |
| `borderWidth` | number | `1` | Arrow border width (in pixels) |
| `borderRadius` | number | `0` | Arrow border radius (in pixels) |
| `edgePadding` | number | `16` | Spacing from popover edges (in pixels) |
| `styleNonce` | string | - | CSP nonce for injected arrow styles |
| `autoStyles` | boolean | `true` | Inject the built-in arrow styles. Set `false` to provide your own CSS |

**Usage**:
```typescript
popover: {
  arrow: {
    size: 16,
    color: "#ffffff",
    borderWidth: 2,
    edgePadding: 20
  }
}
```

These options are written as inline custom properties on the popover, so they take
precedence over the same `--glow-tour-arrow-*` variables set in your stylesheet. Pick one
channel per property - see the [Theming guide](/docs/guides/theming#arrow).

### Indicator options

Control the decorative indicator/pointer that highlights the target element.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hidden` | boolean | `false` | Hide the indicator |
| `gap` | number | `16` | Spacing between indicator and target (in pixels) |
| `placementTryOrder` | Array | `["left", "right", "top", "bottom"]` | Preferred placements in order of preference |
| `animated` | boolean | `true` | Enable/disable animation |
| `animation` | AnimationOptions | - | Custom animation (duration and easing) |

**Usage**:
```typescript
indicator: {
  gap: 20,
  placementTryOrder: ["top", "bottom", "left", "right"],
  hidden: false
}
```

### Behavior options

Control step interaction and scrolling behavior.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowInteraction` | boolean | `false` | Allow clicking/interacting with the target element. Every behavior option can change during the step with `context.props.update({ behavior })` - see [Changing behavior during a step](/docs/guides/programmatic-control#changing-behavior-during-a-step) |
| `allowScroll` | boolean | `true` | The page stays scrollable while the step is shown; set `false` to lock page scroll while the step is shown (restored when a step allows scrolling again, and on finish/cancel/error/dispose) |
| `autoFocus` | boolean | `true` | Focus the popover's Advance button (Previous when going back) when the step is shown. `false` never moves focus during the step, even when a modal step leaves it on the body - see [Keeping focus where it is](/docs/guides/accessibility#keeping-focus-where-it-is) |
| `autoScroll` | boolean | `true` | Scroll the target into view when the step is shown |
| `missingTarget.strategy` | `"error" \| "wait" \| "skip" \| "detached"` | `"error"` | What to do if target isn't found: `"detached"` shows the popover centered over a backdrop covering the whole screen - see [Handling errors](/docs/guides/handling-errors) |
| `missingTarget.timeout` | number | `3000` | Time to wait for target with the `"wait"` strategy (in milliseconds) |
| `overlayClick` | `"none" \| "advance" \| "cancel"` | `"none"` | Action when clicking the dimmed overlay (outside the target) |
| `scroll` | ScrollOptions | - | Scroll behavior (see [Scroll options](#scroll-options)) |

**Usage**:
```typescript
behavior: {
  allowInteraction: true,
  missingTarget: { strategy: "skip" },
  scroll: {
    behavior: "smooth",
    block: "center",
    inline: "nearest"
  }
}
```

**When a target disappears mid-step**: if a step's target is removed from the DOM *while its step is on screen* (a framework remounting it, for example), the presentation freezes in place for a short, fixed grace period instead of disappearing immediately - overlay, popover and pointer hold their last position, and interaction with the underlying page stays blocked even if `allowInteraction` is `true`. If the target reconnects within that window, the tour resumes on it with a smooth reposition and no re-entrance animation. If it doesn't, `missingTarget.strategy` takes over exactly as it does for a target that was never found: `error` fails the tour, `skip` moves on, `detached` moves the popover to the center of the screen over a backdrop without a cutout, and `wait` keeps the presentation frozen for the rest of its budget - the grace period counts against `missingTarget.timeout` rather than adding to it. The tour stays `active` throughout, so the popover's own buttons keep working and remain the way out of a target that never comes back. This freeze isn't configurable; it's a presentation detail of the recovery, not a policy choice.

### Controls options

The advance, previous and cancel commands. Each one takes a `state` for its button and the `keys` that run it.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `advance.state` | `"visible" \| "hidden" \| "disabled"` | `"visible"` | State of the advance button. `"hidden"` and `"disabled"` also block its keys and `overlayClick: "advance"` |
| `advance.keys` | Array | `["Enter", "ArrowRight"]` | Keys that advance to the next step |
| `previous.state` | `"visible" \| "hidden" \| "disabled"` | `"visible"` | State of the previous button, with its keys |
| `previous.keys` | Array | `["ArrowLeft", "Backspace"]` | Keys that go to the previous step |
| `cancel.state` | `"visible" \| "hidden" \| "disabled"` | `"visible"` | State of the cancel button, with its keys and `overlayClick: "cancel"`. The button is never shown when the tour is not cancellable |
| `cancel.keys` | Array | `["Escape"]` | Keys that cancel the tour |

**Usage**:
```typescript
tour.create("onboarding", {
  // Every step: N advances, the arrow keys no longer do.
  controls: { advance: { keys: ["n"] }, previous: { keys: [] } },
})
.step({
  id: "intro",
  target: "#intro",
  content: "Welcome",
  // Keeps the workflow's advance keys: the step only changes the state.
  controls: { previous: { state: "hidden" } },
});
```

A step's controls override the workflow ones field by field: a step that sets only `advance.state` keeps the workflow's `advance.keys`. An empty `keys` array turns the command's keys off. Controls can change during the step with `context.props.update({ controls })`.

A hidden or disabled control only blocks the tour UI: `tour.advance()`, `tour.previous()`, `tour.goTo()` and the step context keep working. The footer is always rendered, even when every control is hidden.

### Class name options

Add CSS classes to a tour component, for the whole workflow or for one step. Each entry takes a
string or an array of strings.

| Option | Component |
|--------|-----------|
| `overlay` | The overlay `<svg>` |
| `popover` | The popover |
| `pointer` | The indicator |
| `header` | The popover header |
| `content` | The popover content |
| `footer` | The popover footer |
| `previous` | The previous button |
| `advance` | The advance button |
| `cancel` | The cancel button |

The classes land on the element that carries the matching `data-glow-tour-*` attribute, the one the
default theme styles:

- They are added after the classes you give the component itself, such as `<GlowTourFooter className="p-2">`, which are never replaced.
- A step's entry overrides the workflow entry for the same component, like the other step options. A component the step leaves out keeps the workflow classes.
- They are removed when the next step shows without them.

**Usage**:
```typescript
tour
  .create("onboarding", { classNames: { popover: "onboarding-popover" } })
  .step({
    id: "billing",
    target: "#billing",
    content: "Plans changed this month.",
    // On this step the popover gets "popover-warning" instead of "onboarding-popover".
    classNames: { popover: "popover-warning", advance: ["button", "button-danger"] },
  })
  .build();
```

To change the classes during a step, see [Updating step props](/docs/guides/programmatic-control#updating-step-props).

### Lifecycle hook context

The `onStart`, `onCancel`, and `onFinish` callbacks receive a `LifecycleHookContext` object:

| Property | Type | Description |
|----------|------|-------------|
| `step` | `TourCurrentStep \| null` | The step associated with this transition (see JSDoc for per-hook semantics) |
| `abort()` | function | Call synchronously (or before the hook's promise resolves) to prevent the transition |

**Transition semantics**:
- `onStart`: `step` is the first step about to be entered, or `null` if the workflow has no steps. Calling `abort()` prevents the tour from starting.
- `onCancel`: `step` is always the current step (never `null` at cancellation time). Calling `abort()` prevents cancellation and keeps the tour active.
- `onFinish`: `step` is the last step the tour was on, or `null` only for zero-step workflows. Calling `abort()` prevents completion and keeps the tour in its current state.

**Usage** (example: confirm before cancelling):
```typescript
onCancel: (context) => {
  if (!window.confirm("Are you sure you want to exit the tour?")) {
    context.abort();
  }
}
```

### Scroll options

Control how the browser scrolls to the target element. A step scrolls only when
part of its target falls outside the viewport; `autoScroll: false` opts out
entirely.

The step does not wait for the scroll to finish before appearing. The spotlight
shows up straight away and tracks the target as the page travels; the popover
and the pointer enter once the page has come to rest, so they are never placed
against a rect that is still moving.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `behavior` | `"auto" \| "smooth"` | `"smooth"`* | Scroll animation style |
| `block` | `"start" \| "center" \| "end" \| "nearest"` | `"center"` | Vertical alignment within viewport |
| `inline` | `"start" \| "center" \| "end" \| "nearest"` | `"nearest"` | Horizontal alignment within viewport |

*Automatically switches to `"instant"` when the browser detects `prefers-reduced-motion`.

**Usage**:
```typescript
scroll: {
  behavior: "smooth",
  block: "center",
  inline: "nearest"
}
```

### Animation options

Control animation timing.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `duration` | number | `180` | Animation duration (in milliseconds) |
| `easing` | string | `"ease-out"` | CSS easing function |

**Usage**:
```typescript
animation: {
  duration: 300,
  easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
}
```

When `animated` is `false` or reduced motion is detected, animations disable and duration collapses to `0`.

### Wait options

Options for `.waitUntil()` and `.waitUntilElement()`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `interval` | number | `16` | How often to check condition (in milliseconds) |
| `timeout` | number | `3000` | Maximum wait time (in milliseconds) |

**Usage**:
```typescript
.waitUntil(() => dataLoaded, {
  interval: 100,
  timeout: 10000
})
```

## Types

Builder-related type exports for TypeScript users:

- `WorkflowBuilder` - Workflow builder interface
- `WorkflowStepBuilder` - Step builder interface (chained after `.step()`)
- `WorkflowDefinition` - Immutable compiled workflow
- `StepParameters` - Parameters for `.step()`
- `StartOptions` - Options for `tour.create()`
- `LifecycleHookContext` - Context passed to `onStart`, `onCancel`, `onFinish` callbacks
- `StepBehavior` - Behavior options
- `TourControls` - Controls options, one `TourControl` (`state`, `keys`) per command
- `OverlayOptions` - Overlay options
- `PopoverOptions` - Popover options
- `PopoverArrowOptions` - Arrow options
- `IndicatorOptions` - Indicator options
- `ScrollOptions` - Scroll options
- `AnimationOptions` - Animation options
- `WaitUntilOptions` - Wait options
- `StepContext` - Context passed to step actions and target event handlers
- `StepHookContext` - Context passed to `beforeEnter` and `beforeLeave` (no navigation methods, `abort()` to stop the navigation)
- `StepHookAction` - Callback type for `beforeEnter` and `beforeLeave`
- `TargetResolver` - Target resolution function type

See the [Tour reference](/docs/reference/tour) for the controller API that runs a built workflow.
