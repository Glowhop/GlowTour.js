---
title: Programmatic control guide
description: Control tours with state subscriptions, actions, and callbacks.
---

GlowTour.js provides a complete programmatic API for controlling tours, observing state changes, and sequencing complex workflows.

## Tour instance

Every adapter's `createGlowTour()` function returns a tour controller. It holds state, manages workflows, and dispatches events. In a component, the adapter's `useGlowTour()` (Angular: `injectGlowTour()`) returns the same controller; the examples below use the instance directly so they work in any framework.

```typescript
import { createGlowTour } from "@glowhop/react-tour";

const tour = createGlowTour();
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

See [`tour.state.get()`](/docs/reference/tour#tourstateget) for every state field.

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
console.log("First step is on screen");
```

`run()` resolves once the first step is on screen, not when the tour ends. It rejects if that first step fails. To react to the end of the tour, use the workflow's `onFinish` and `onCancel` callbacks, an `onEvent` listener for `tour:complete` and `tour:cancel`, or a `subscribe` listener that checks `status`. See [The promise trap](/docs/guides/handling-errors#the-promise-trap).

### Navigation commands

While a tour is active, control it with these methods:

```typescript
// Move to the next step
await tour.advance();

// Go to the previous step
await tour.previous();

// Jump to a specific step by id
await tour.goTo("billing");

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
- `.beforeLeave()` runs before `advance()`, `previous()`, `goTo()`, or finishing the tour. It does
  not run on cancel: use the workflow's `onCancel` option, which receives the current step.
- Both can be async and pause the transition until they resolve. `context.direction` tells which way
  the tour is moving.
- Both can stop the navigation with `context.abort()`, called synchronously or before their promise
  resolves. The tour stays on the step it was on and emits no event. When the first step's
  `beforeEnter` aborts, the tour goes back to `idle`, like an aborted `onStart`.

```typescript
.beforeLeave(({ abort, direction }) => {
  // Keep the user here until the form is valid.
  if (direction === "advance" && !form.checkValidity()) abort();
})
```

Step props are not reset automatically: a value set with `context.props.set()` is still there when the
tour comes back to the step, until the workflow runs again.

## Updating step props

`context.props` is a small store: `get()` reads the current props, `set()` replaces them, and
`update()` merges a partial change into them:

```typescript
.do(({ props }) => {
  // Only this option changes; the other popover options, the title and the content are kept.
  props.update({ popover: { controls: { advance: "visible" } } });
})
```

- Fields left out of the change are kept.
- `data` is merged key by key.
- `overlay`, `popover`, and `indicator` are merged the way step options merge over the workflow
  defaults.
- Arrays such as `placementTryOrder` are replaced, never concatenated.
- `classNames` is merged per component: a component named in the change gets exactly the classes
  given.

Pass a function to compute the change from the current props:

```typescript
props.update((current) => ({ data: { clicks: Number(current.data?.clicks ?? 0) + 1 } }));
```

To add a single class to the current ones, read them in the function form. They are a string or an
array:

```typescript
props.update((current) => ({
  classNames: { popover: [current.classNames?.popover ?? [], "popover-highlighted"].flat() },
}));
```

`update()` validates and publishes once, like `set()`. To remove a value, use `set()`.

## Changing behavior during a step

`behavior` is part of the step props: `context.props.update({ behavior })` changes it while the
tour runs, and `context.props.get().behavior` reads it. Like the other props, the value is kept
when the tour comes back to the step, until the workflow runs again.

Each field takes effect when GlowTour reads it:

| Field | Read | A change made during the step |
| --- | --- | --- |
| `allowInteraction` | Continuously | Applies at once: the page becomes inert or usable again, focus leaves the target when interaction is blocked, and the indicator fades out or back in |
| `overlayClick` | On each click on the dimmed area | Applies to the next click |
| `autoFocus`, `autoScroll`, `scroll` | When the step is entered | Applies on the next visit, or to this one when set in `beforeEnter` |
| `keyboard` | On each key press | Applies to the next key press |
| `missingTarget` | When the target is resolved, and when a lost target is recovered | Applies to the next resolution. `beforeEnter` runs after the target is resolved, so it is too late for the visit in progress |

A button the user may click only once:

```typescript
.step({
  id: "pay",
  target: "#pay",
  title: "Pay",
  content: "Click Pay to continue.",
  behavior: { allowInteraction: true },
  popover: { controls: { advance: "hidden" } },
})
.onTargetEvent("click", (_event, { props }) => {
  props.update({
    behavior: { allowInteraction: false },
    popover: { controls: { advance: "visible" } },
  });
})
```

To start from the configured behavior on every visit, reset it in `beforeEnter`:

```typescript
.beforeEnter(({ props, initialProps }) => props.update({ behavior: initialProps.behavior }))
```

`props.set()` replaces every prop, `behavior` included: spread the current props to keep it, or the
step runs without the behavior it was configured with.

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

A subscriber or step callback that throws is reported to `onSubscriberError` and does not fail the tour. A fatal error rejects the command and sets `status` to `"error"`. See [Handling errors](/docs/guides/handling-errors) for how to observe and recover from both.

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
