---
title: Builder API reference
description: Complete reference for the Glow Tour workflow/step builder and all available options with their defaults.
---

`tour.create()` returns a workflow builder: chain `.step()`, `.do()`, `.wait()`, and the other methods below to describe a tour, then call `.build()` to get an immutable `WorkflowDefinition`. For the controller that runs the resulting workflow (`createGlowTour`, `tour.run`, `tour.advance`, `tour.state`, …), see the [Tour reference](/docs/reference/tour).

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
  .step({ /* ... */ })
  .build();
```

### `.step(params)`

Adds a step to the workflow.

**Signature**:
```typescript
step(params: StepParameters): WorkflowStepBuilder
```

**Parameters**:
- `target` - CSS selector, HTMLElement, or resolver function (required)
- `title` - Step title displayed in popover (required)
- `content` - Step description displayed in popover (required)
- `resetPropsOnEnter` - Reset step props on enter (default `true`)
- `data` - Optional record for custom step data
- `overlay` - Overlay options (see [Overlay options](#overlay-options))
- `popover` - Popover options (see [Popover options](#popover-options))
- `indicator` - Indicator options (see [Indicator options](#indicator-options))
- `behavior` - Behavior options (see [Behavior options](#behavior-options))

**Usage**:
```typescript
.step({
  target: "#feature",
  title: "Meet the new feature",
  content: "This will help you be more productive",
  overlay: { opacity: 0.6 },
  popover: { placementTryOrder: ["bottom", "top"] }
})
```

### `.do(fn)`

Executes a function between steps. Can be async.

**Signature**:
```typescript
do(fn: () => void | Promise<void>): WorkflowStepBuilder
```

**Usage**:
```typescript
.do(async () => {
  // Wait for data to load
  await fetchData();
})
.step({
  target: "#results",
  title: "Results loaded",
  content: "Data is now available"
})
```

### `.wait(ms)`

Pauses for a fixed duration.

**Signature**:
```typescript
wait(ms: number): WorkflowStepBuilder
```

**Usage**:
```typescript
.step({ /* ... */ })
.wait(2000)  // Wait 2 seconds
.step({ /* ... */ })
```

### `.waitUntil(fn, options?)`

Waits until a condition returns true.

**Signature**:
```typescript
waitUntil(
  fn: () => boolean,
  options?: WaitUntilOptions
): WorkflowStepBuilder
```

**Parameters**:
- `fn` - Condition function that returns true when ready
- `options` - Wait options (see [Wait options](#wait-options))

**Usage**:
```typescript
.waitUntil(() => document.querySelector("#data") !== null, {
  interval: 100,
  timeout: 5000
})
.step({
  target: "#data",
  title: "Here's your data",
  content: "The data has loaded"
})
```

### `.waitUntilElement(selector, options?)`

Waits until an element enters the DOM.

**Signature**:
```typescript
waitUntilElement(
  selector: string,
  options?: WaitUntilOptions
): WorkflowStepBuilder
```

**Parameters**:
- `selector` - CSS selector to wait for
- `options` - Wait options (see [Wait options](#wait-options))

**Usage**:
```typescript
.waitUntilElement("#modal", { timeout: 3000 })
.step({
  target: "#modal",
  title: "Modal opened",
  content: "The modal is now visible"
})
```

### `.onTargetEvent(eventName, handler)`

Listens for a DOM event on the current target during this step.

**Signature**:
```typescript
onTargetEvent(
  eventName: string,
  handler: (event: Event, context: StepContext) => void
): WorkflowStepBuilder
```

**Usage**:
```typescript
.step({
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
    target: "#welcome",
    title: "Welcome",
    content: "Let's get started"
  })
  .build();
```

### `beforeAdvance(context)`

Step-level callback, passed as part of `.step()`'s `params`. Called before advancing to the next step. Can be async.

**Signature**:
```typescript
beforeAdvance?(context: StepContext): void | Promise<void>
```

**Usage**:
```typescript
.step({
  target: "#button",
  title: "Step 1",
  content: "Description",
  beforeAdvance: async (context) => {
    // Perform cleanup or validation
    await saveFormData();
  }
})
```

### `beforeCancel(context)`

Step-level callback, passed as part of `.step()`'s `params`. Called before cancelling the tour. Can be async.

**Signature**:
```typescript
beforeCancel?(context: StepContext): void | Promise<void>
```

### `beforePrevious(context)`

Step-level callback, passed as part of `.step()`'s `params`. Called before going to the previous step. Can be async.

**Signature**:
```typescript
beforePrevious?(context: StepContext): void | Promise<void>
```

## Option reference

### Start options

Options passed to `tour.create()` to configure the initial workflow behavior.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cancellable` | boolean | `true` | Whether the tour can be cancelled by the user |
| `animated` | boolean | `true`* | Enable animations (auto-disabled if OS prefers reduced motion) |
| `overlay` | OverlayOptions | — | Overlay appearance (see [Overlay options](#overlay-options)) |
| `popover` | PopoverOptions | — | Popover appearance (see [Popover options](#popover-options)) |
| `indicator` | IndicatorOptions | — | Indicator appearance (see [Indicator options](#indicator-options)) |
| `behavior` | StepBehavior | — | Step behavior (see [Behavior options](#behavior-options)) |
| `onStart` | `() => void \| Promise<void>` | — | Called when the tour starts |
| `onCancel` | `() => void \| Promise<void>` | — | Called when the tour is cancelled |
| `onFinish` | `() => void \| Promise<void>` | — | Called when the tour completes |

*Animations automatically disable when the browser detects `prefers-reduced-motion`.

### Overlay options

Control the semi-transparent overlay that darkens non-target areas.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `color` | string | — | Overlay color (uses theme's overlay fill if not set) |
| `opacity` | number | `0.7` | Overlay opacity (0 = transparent, 1 = opaque) |
| `padding` | number | `16` | Padding around the target element (in pixels) |
| `radius` | number | `12` | Border radius of the overlay cutout (in pixels) |
| `animated` | boolean | `true` | Enable/disable animation |
| `animation` | AnimationOptions | — | Custom animation (duration and easing) |

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
| `gap` | number | `14` | Spacing between popover and target (in pixels) |
| `hideFooter` | boolean | `false` | Hide the footer with navigation buttons |
| `hideAdvanceButton` | boolean | `false` | Hide the "Next" button (keyboard still works) |
| `disableAdvanceButton` | boolean | `false` | Disable advancing (keyboard and button blocked) |
| `hidePreviousButton` | boolean | `false` | Hide the "Previous" button (keyboard still works) |
| `disablePreviousButton` | boolean | `false` | Disable going back (keyboard and button blocked) |
| `animated` | boolean | `true` | Enable/disable animation |
| `animation` | AnimationOptions | — | Custom animation (duration and easing) |
| `keyboardShortcuts.advance` | Array | `["Enter", "ArrowRight"]` | Keys to advance to next step |
| `keyboardShortcuts.previous` | Array | `["ArrowLeft", "Backspace"]` | Keys to go to previous step |
| `keyboardShortcuts.cancel` | Array | `["Escape"]` | Keys to cancel the tour |
| `arrow` | PopoverArrowOptions | — | Arrow/pointer styling (see [Arrow options](#arrow-options)) |

**Usage**:
```typescript
popover: {
  placementTryOrder: ["right", "bottom", "left", "top"],
  gap: 20,
  hideFooter: false,
  keyboardShortcuts: {
    advance: ["Enter", "Space"],
    previous: ["Backspace"],
    cancel: ["Escape"]
  }
}
```

### Arrow options

Customize the arrow that points from the popover to the target element.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `disabled` | boolean | `false` | Hide the arrow |
| `color` | string | — | Arrow color (uses theme's surface color if not set) |
| `size` | number or string | `12px` | Arrow dimensions |
| `borderWidth` | number or string | `1px` | Arrow border width |
| `borderRadius` | number or string | `0px` | Arrow border radius |
| `edgePadding` | number | `16` | Spacing from popover edges (in pixels) |
| `styleNonce` | string | — | CSP nonce for injected arrow styles |
| `disableAutoStyles` | boolean | `false` | Skip injecting built-in arrow styles (provide your own CSS) |

**Usage**:
```typescript
popover: {
  arrow: {
    size: 16,
    color: "#ffffff",
    borderWidth: "2px",
    edgePadding: 20
  }
}
```

### Indicator options

Control the decorative indicator/pointer that highlights the target element.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `disabled` | boolean | `false` | Hide the indicator |
| `gap` | number | `16` | Spacing between indicator and target (in pixels) |
| `placementTryOrder` | Array | `["left", "right", "top", "bottom"]` | Preferred placements in order of preference |
| `animated` | boolean | `true` | Enable/disable animation |
| `animation` | AnimationOptions | — | Custom animation (duration and easing) |

**Usage**:
```typescript
indicator: {
  gap: 20,
  placementTryOrder: ["top", "bottom", "left", "right"],
  disabled: false
}
```

### Behavior options

Control step interaction and scrolling behavior.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowInteraction` | boolean | `false` | Allow clicking/interacting with the target element |
| `disableAutoFocus` | boolean | `false` | Skip auto-focusing the target element |
| `disableAutoScroll` | boolean | `false` | Skip auto-scrolling to the target |
| `missingTargetStrategy` | `"error" \| "wait" \| "skip"` | `"error"` | What to do if target isn't found |
| `targetTimeout` | number | `3000` | Time to wait for target (in milliseconds) |
| `scroll` | ScrollOptions | — | Scroll behavior (see [Scroll options](#scroll-options)) |

**Usage**:
```typescript
behavior: {
  allowInteraction: true,
  disableAutoFocus: false,
  missingTargetStrategy: "skip",
  targetTimeout: 5000,
  scroll: {
    behavior: "smooth",
    block: "center",
    inline: "nearest"
  }
}
```

### Scroll options

Control how the browser scrolls to the target element.

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
- `StepBehavior` - Behavior options
- `OverlayOptions` - Overlay options
- `PopoverOptions` - Popover options
- `PopoverArrowOptions` - Arrow options
- `IndicatorOptions` - Indicator options
- `ScrollOptions` - Scroll options
- `AnimationOptions` - Animation options
- `WaitUntilOptions` - Wait options
- `StepContext` - Context passed to step callbacks
- `TargetResolver` - Target resolution function type

See the [Tour reference](/docs/reference/tour) for the controller API that runs a built workflow.
