---
title: Programmatic control guide
description: Control tours with state subscriptions, actions, and callbacks.
---

Glow Tour provides a complete programmatic API for controlling tours, observing state changes, and sequencing complex workflows.

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

console.log(state.status);        // "idle", "active", "error", "completed"
console.log(state.currentStep);   // Current step info (or null if not active)
console.log(state.error);         // Error if status === "error"
```

State includes:

- `status` - Current tour state
- `currentStep` - Current step data
- `canAdvance` - Whether advancing is allowed
- `canPrevious` - Whether going back is allowed
- `canCancel` - Whether cancelling is allowed
- `error` - Error if the tour failed

### Subscribing to changes

```typescript
const unsubscribe = tour.state.subscribe((newState) => {
  console.log("Tour state changed:", newState);
  if (newState.status === "completed") {
    console.log("Tour finished!");
  }
});

// Call unsubscribe() to stop listening
unsubscribe();
```

## Running tours

### Basic run

```typescript
const workflow = tour.create("intro").step({ /* ... */ }).build();
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
    onStart() {
      console.log("Tour started");
    },
    onCancel() {
      console.log("Tour cancelled by user");
    },
    onFinish() {
      console.log("Tour completed all steps");
    },
  })
  .step({ /* ... */ })
  .build();
```

## Transition callbacks

React to step transitions:

```typescript
const workflow = tour
  .create("transitions")
  .step({
    target: "#step1",
    title: "First",
    content: "Step 1",
    beforeAdvance: async (context) => {
      console.log("About to advance from step 1");
      // Perform async work, e.g., save user progress
      await saveProgress();
    },
  })
  .step({
    target: "#step2",
    title: "Second",
    content: "Step 2",
    beforePrevious: async (context) => {
      console.log("About to go back to step 1");
    },
  })
  .step({
    target: "#step3",
    title: "Third",
    content: "Step 3",
    beforeCancel: async (context) => {
      console.log("About to cancel the tour");
    },
  })
  .build();
```

`beforeAdvance`, `beforePrevious`, and `beforeCancel` can be async and will pause the transition until they resolve.

## Step actions

Sequence work between steps using `.do()`, `.wait()`, and other action methods:

```typescript
const workflow = tour
  .create("with-actions")
  .step({
    target: "#field",
    title: "Enter data",
    content: "Type something in this field.",
  })
  .do(async () => {
    console.log("User finished step 1");
  })
  .wait(1000) // Wait 1 second
  .step({
    target: "#submit",
    title: "Submit",
    content: "Click the submit button.",
  })
  .waitUntil(() => {
    // Wait until form is submitted
    return document.querySelector("form")?.dataset.submitted === "true";
  })
  .step({
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

## Target events

React to DOM events on the current target:

```typescript
const workflow = tour
  .create("events")
  .step({
    target: "#button",
    title: "Click me",
    content: "This button triggers an action.",
  })
  .onTargetEvent("click", (event, context) => {
    console.log("Target was clicked during this step");
  })
  .step({
    target: "#next",
    title: "Next",
    content: "Continue the tour.",
  })
  .build();
```

The event handler receives the native DOM event and the step context.

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
const tour = createGlowTour({
  onStart() {
    analytics.track("tour_started");
  },
  onFinish() {
    analytics.track("tour_completed");
  },
  onSubscriberError(error) {
    logger.error("Tour error", error);
  },
});

const workflow = tour
  .create("onboarding", {
    onCancel() {
      analytics.track("tour_cancelled");
    },
  })
  .step({
    target: "#welcome",
    title: "Welcome",
    content: "Let's get started!",
    beforeAdvance: async () => {
      await api.logEvent("welcome_seen");
    },
  })
  .wait(500)
  .step({
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
    target: "#dashboard",
    title: "You're ready!",
    content: "Explore your dashboard.",
    beforeCancel: async (context) => {
      if (context.canPrevious) {
        // User is backing up; don't log finish
        return;
      }
    },
  })
  .build();

// Run the tour
await tour.run(workflow);
```

---

For the full workflow/step-building API and every option's default value, see the [Builder reference](/docs/reference/builder); for the controller API (`createGlowTour`, `tour.run`, `tour.state`, …), see the [Tour reference](/docs/reference/tour).
