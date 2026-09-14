---
title: Programmatic control guide
description: Control tours with state subscriptions, actions, and callbacks.
---

GlowTour.js provides a complete programmatic API for controlling tours, observing state changes, and sequencing complex workflows.

## Tour instance

Every adapter's `createGlowTour()` function returns a tour controller. Keep this instance alive for your app's lifetime; it holds state, manages workflows, and dispatches events.

```typescript
import { createGlowTour } from "@glowhop/react-tour";

const tour = createGlowTour();
// Reuse the same instance across your app
```

## Tour state

Access the current tour state and subscribe to changes:

### Reading state

```typescript
const state = tour.state.get();

console.log(state.status);        // "idle" | "starting" | "transitioning" | "active" | "finished" | "cancelled" | "error" | "disposed"
console.log(state.currentStep);   // Current step info (or null if not active)
console.log(state.error);         // Error if status === "error"
```

State includes:

- `name` - Name of the running workflow
- `totalSteps` - Total number of steps in the workflow
- `currentStepIndex` - Index of the active step (0-based), or -1 if none
- `status` - Current tour state
- `currentStep` - Current step data
- `direction` - Direction of the last navigation ("advance" or "previous")
- `canAdvance` - Whether advancing is allowed
- `canPrevious` - Whether going back is allowed
- `canCancel` - Whether cancelling is allowed
- `isFirstStep` - Whether the tour is on the first step
- `isLastStep` - Whether the tour is on the last step
- `error` - Error if the tour failed

### Subscribing to changes

```typescript
const unsubscribe = tour.state.subscribe((newState) => {
  console.log("Tour state changed:", newState);
  if (newState.status === "finished") {
    console.log("Tour finished!");
  }
});

// Call unsubscribe() to stop listening
unsubscribe();
```

## Running tours

### Basic run

```typescript
const workflow = tour.create("intro").step({ id: "step-1", /* ... */ }).build();
await tour.run(workflow);
console.log("Tour completed");
```

The `run()` method is async and resolves when the tour completes, is cancelled, or errors.

### Navigation commands

While a tour is active, control it with these methods:

```typescript
// Move to the next step
await tour.advance();

// Go to the previous step
await tour.previous();

// Jump to a specific step by index
await tour.goToStep(2);

// Cancel and end the tour
await tour.cancel();

// Clean up and release resources
tour.dispose();
```

## Lifecycle callbacks

React to tour events at the workflow level:

```typescript
const workflow = tour
  .create("my-tour", {
    onStart(context) {
      console.log("Tour started on step:", context.step?.initialProps.title);
    },
    onCancel(context) {
      console.log("Tour cancelled by user at step:", context.step?.initialProps.title);
    },
    onFinish(context) {
      console.log("Tour completed all steps, last step:", context.step?.initialProps.title);
    },
  })
  .step({ id: "step1", /* ... */ })
  .build();
```

## Step hooks

Run code when a step is entered or left. These are builder *methods* chained after a `.step()` call,
not options inside it - they attach to the step that precedes them:

```typescript
const workflow = tour
  .create("hooks")
  .step({
    id: "step1",
    target: "#step1",
    title: "First",
    content: "Step 1",
  })
  .beforeLeave(async ({ direction }) => {
    // Perform async work, e.g., save user progress
    if (direction === "advance") await saveProgress();
  })
  .step({
    id: "step2",
    target: "#step2",
    title: "Second",
    content: "Step 2",
  })
  .beforeEnter(({ direction, props, initialProps }) => {
    // Coming back from a later step: start again from the declared props.
    if (direction === "previous") props.set(initialProps);
  })
  .build();
```

- `.beforeEnter()` runs after the step's target is resolved and before the step is shown, so the props
  it sets are the first ones rendered.
- `.beforeLeave()` runs before `advance()`, `previous()`, `goToStep()`, or finishing the tour. It does
  not run on cancel: use the workflow's `onCancel` option, which receives the current step.
- Both can be async and pause the transition until they resolve. `context.direction` tells which way
  the tour is moving.

Step props are not reset automatically: a value set with `context.props.set()` is still there when the
tour comes back to the step, until the workflow runs again.

## Updating step props

`context.props` is a small store: `get()` reads the current props, `set()` replaces them, and
`update()` merges a partial change into them:

```typescript
.do(({ props }) => {
  // Only this option changes; the other popover options, the title and the content are kept.
  props.update({ popover: { disableAdvanceButton: false } });
})
```

- Fields left out of the change are kept.
- `data` is merged key by key.
- `overlay`, `popover`, and `indicator` are merged the way step options merge over the workflow
  defaults.
- Arrays such as `placementTryOrder` are replaced, never concatenated.

Pass a function to compute the change from the current props:

```typescript
props.update((current) => ({ data: { clicks: Number(current.data?.clicks ?? 0) + 1 } }));
```

`update()` validates and publishes once, like `set()`. To remove a value, use `set()`.

## Step actions

Sequence work between steps using `.do()`, `.wait()`, and other action methods:

```typescript
const workflow = tour
  .create("with-actions")
  .step({
    id: "field",
    target: "#field",
    title: "Enter data",
    content: "Type something in this field.",
  })
  .do(async () => {
    console.log("User finished step 1");
  })
  .wait(1000) // Wait 1 second
  .step({
    id: "submit",
    target: "#submit",
    title: "Submit",
    content: "Click the submit button.",
  })
  .waitUntil(() => {
    // Wait until form is submitted
    return document.querySelector("form")?.dataset.submitted === "true";
  })
  .step({
    id: "success",
    target: "#success",
    title: "Done!",
    content: "Your form was submitted.",
  })
  .build();
```

Available actions:

- `.do(fn)` - Execute a function (can be async)
- `.wait(ms)` - Wait for a duration in milliseconds
- `.waitUntil(fn, options)` - Wait until a condition is true (default: checks every 16ms, 3000ms timeout)
- `.waitUntilElement(selector, options)` - Wait until an element enters the DOM
- `.clickTarget()` - Click the current step's target element
- `.focusTarget()` - Focus the current step's target element

## Composing workflows

`.append(workflow)` splices an already-built workflow's steps into the one you are building, so you can
define reusable fragments once and reuse them across tours:

```typescript
const profileSteps = tour
  .create("profile-fragment")
  .step({ id: "profile", target: "#profile", title: "Your profile", content: "Complete it to continue." })
  .build();

const workflow = tour
  .create("onboarding")
  .step({ id: "welcome", target: "#welcome", title: "Welcome", content: "Let's get started!" })
  .append(profileSteps)
  .step({ id: "dashboard", target: "#dashboard", title: "You're ready!", content: "Explore your dashboard." })
  .build();
```

## Target events

React to DOM events on the current target:

```typescript
const workflow = tour
  .create("events")
  .step({
    id: "button",
    target: "#button",
    title: "Click me",
    content: "This button triggers an action.",
  })
  .onTargetEvent("click", (event, context) => {
    console.log("Target was clicked during this step");
  })
  .step({
    id: "next",
    target: "#next",
    title: "Next",
    content: "Continue the tour.",
  })
  .build();
```

The event handler receives the native DOM event and the step context.

Pass an array to bind the same handler to several events at once:

```typescript
.onTargetEvent(["focus", "blur"], (event, context) => {
  console.log("Target received:", event.type);
})
```

## Error handling

Handle subscriber errors that don't crash the tour:

```typescript
const tour = createGlowTour({
  onSubscriberError(error) {
    console.error("A subscriber threw an error:", error);
    // Log it, report it, but the tour continues
  },
});
```

State subscriber functions or step callback functions that throw are caught, normalized to `Error`, and reported to `onSubscriberError`. They do not fail the tour transition.

A fatal error from the rendering layer (e.g., the popover component throws) will reject the command and set the tour state to `status === "error"` with the error details.

## Example: complex tour

Here's a tour that combines multiple features:

```typescript
// `createGlowTour` only takes controller-level options; lifecycle hooks belong to the workflow.
const tour = createGlowTour({
  onSubscriberError(error) {
    logger.error("Tour error", error);
  },
});

const workflow = tour
  .create("onboarding", {
    onStart(context) {
      analytics.track("tour_started");
    },
    onCancel({ step }) {
      // The lifecycle context carries a snapshot of the step the user was on.
      analytics.track("tour_cancelled", { step: step?.id });
    },
    onFinish(context) {
      analytics.track("tour_completed");
    },
  })
  .step({
    id: "welcome-2",
    target: "#welcome",
    title: "Welcome",
    content: "Let's get started!",
  })
  .beforeLeave(async ({ direction }) => {
    if (direction === "advance") await api.logEvent("welcome_seen");
  })
  .wait(500)
  .step({
    id: "profile-2",
    target: "#profile",
    title: "Your profile",
    content: "Complete your profile to unlock all features.",
  })
  .waitUntil(() => {
    return document.querySelector("form")?.dataset.valid === "true";
  })
  .do(async () => {
    await api.submitProfile();
  })
  .step({
    id: "dashboard-2",
    target: "#dashboard",
    title: "You're ready!",
    content: "Explore your dashboard.",
  })
  .build();

// Run the tour
await tour.run(workflow);
```

---

For the full workflow/step-building API and every option's default value, see the [Builder reference](/docs/reference/builder); for the controller API (`createGlowTour`, `tour.run`, `tour.state`, …), see the [Tour reference](/docs/reference/tour).
