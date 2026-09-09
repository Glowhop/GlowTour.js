---
title: Handling errors
description: Respond to tour failures in three channels — onEvent, state, or promises — using strategies for missing targets.
---

A tour fails when a step's target element is missing or missing for too long. What happens next depends on which channel you listen on, and what strategy the step declares upfront.

## Missing target strategies

Every step can declare how to handle a missing target:

```typescript
.step({
  id: "settings",
  target: "#settings-panel",
  title: "Settings",
  content: "Configure your preferences.",
  behavior: { missingTargetStrategy: "error", targetTimeout: 3000 },
})
```

| Strategy | Timeout applies | Behavior |
| --- | --- | --- |
| `"error"` | No | Throw immediately, halting the tour. The error is reported on all three channels. |
| `"wait"` | Yes, default 3000ms | Poll for the target, waiting up to `targetTimeout` before falling back to `"error"` |
| `"skip"` | No | Resolve to `null` and advance past the step without showing it. No error is thrown. |

The default is `"error"` because missing targets are usually bugs: the app changed, the selector is stale, or a dynamic element never rendered. Catching them loudly keeps tours working.

`"wait"` suits async scenarios where a target might appear after navigation or a fetch. Set `targetTimeout` to match your app's worst case, or leave it at 3000ms and override per step if needed.

`"skip"` is for optional steps that some users may never see. If skipped forward past the last step, the tour finishes. If skipped backward past the first, the tour cancels (unless it is not cancellable, then it stays on the first step).

## Three channels

A tour error is reported through three separate channels. They are not equivalent — each one solves a different job.

### 1. onEvent monitoring

`onEvent` is the monitoring callback wired to analytics:

```typescript
const tour = createGlowTour({
  onEvent: (event) => {
    if (event.type === "tour:error") {
      analytics.track("tour_failed", {
        step: event.stepId,
        error: event.error?.message,
      });
    }
  },
});
```

The callback receives a `tour:error` event with:
- `error`: the `Error` object (`Missing target at steps[N]: <selector>`)
- `stepId`, `stepIndex`, `stepCount`: where the tour was
- `durationMs`: how long the tour was running before the failure
- The event carries the same fields as other events — `workflowName`, `source`, `direction`, `timestamp`.

`onEvent` is the right channel for analytics and observability.

Note: `tour:error` is not preceded by `step:leave`. The step was not left — the tour died on it — and the event still names that step, so the pair reconciles in a funnel. See [Monitoring a tour](/docs/guides/monitoring) for the full event order.

### 2. Tour state

The tour state holds the error in a reactive channel:

```typescript
tour.state.subscribe((state) => {
  if (state.status === "error" && state.error) {
    showErrorBanner(state.error.message);
  }
});
```

The state carries:
- `status`: becomes `"error"` on failure
- `error`: the `Error` object, or `null` if the tour is not in an error state

This is the channel for UI — show a message, disable buttons, or log internally. Unlike `onEvent`, you can read the error synchronously:

```typescript
const state = tour.state.get();
if (state.status === "error") {
  console.error("Tour failed:", state.error);
}
```

In React, use the `useTour` hook, which exposes the same state; every adapter follows the same pattern.

### 3. Rejected promise

The promise from the method that triggered the failure is rejected:

```typescript
try {
  await tour.run(workflow);
} catch (error) {
  console.error("Tour failed on first step:", error);
}
```

This is a local convenience for simple patterns, but it has a hard limit.

## The promise trap

`run()` resolves once the **first step is on screen**, not after the whole tour:

```typescript
await tour.run(workflow);
// ← The first step is now visible. Any other step may still fail later.
```

So a `try/catch` around `run()` only catches failures on that first step. A target missing on step 2, 3, or later is not caught there — it rejects the `advance()`, `previous()`, or `goToStep()` call that caused it:

```typescript
try {
  await tour.advance();
  // ← Only failures triggered by *this call* are caught here.
} catch (error) {
  console.error("Failed advancing to the next step:", error);
}
```

A third case: if a target disappears *after* the step was shown — the overlay is already on screen and the target unmounts — the failure is routed through the driver's recovery path and reported via `onEvent` and state, but the promise is not rejected. There is nothing to catch, so you must listen on `onEvent` or `state` to handle it.

**Conclusion**: Use `onEvent` and `state` for complete, reliable error handling. Promises are a convenience for synchronous paths, not a complete channel.

## What is not a tour error

An exception thrown inside `onEvent` or a state subscriber does not become the tour's own error:

```typescript
tour.state.subscribe((state) => {
  throw new Error("oops");
  // ← This does not halt the tour or become state.error.
});
```

Subscriber errors are routed to `GlowTourOptions.onSubscriberError`, or to an unhandled error reporter if none is set. The tour carries on. This isolation keeps tours resilient to bugs in your own listeners.

The lifecycle hooks are the opposite: a throw in `onStart`, `onCancel` or `onFinish` is a tour failure like any other, and it lands on all three channels. Use `context.abort()` when you want to stop a transition without failing the tour.

## Example: recovery UI

Combine state and `missingTargetStrategy` to build a transparent recovery path:

```typescript
const tour = createGlowTour({
  onEvent: (event) => {
    if (event.type === "tour:error") {
      // Log the failure for monitoring.
      console.log(
        `Tour failed at step ${event.stepIndex + 1}/${event.stepCount}:`,
        event.error?.message
      );
    }
  },
});

const workflow = tour
  .create("checkout")
  .step({
    id: "cart",
    target: "#cart",
    title: "Your cart",
    content: "Review your items.",
    // If the cart element hasn't loaded yet, wait a bit.
    behavior: { missingTargetStrategy: "wait", targetTimeout: 5000 },
  })
  .step({
    id: "checkout",
    target: "#checkout",
    title: "Proceed to checkout",
    content: "Click here to complete your order.",
    // If checkout is removed or hidden (app error), skip it silently.
    behavior: { missingTargetStrategy: "skip" },
  })
  .build();

// Show error state in the UI.
tour.state.subscribe((state) => {
  if (state.status === "error") {
    const message = state.error?.message ?? "Tour stopped unexpectedly";
    console.error(message);
    // Re-enable the page or show a retry button.
  }
});

await tour.run(workflow);
```

Here, the cart step waits up to 5 seconds for its element — useful if you navigate to it from another page. The checkout step is marked `skip`, so even if the element is gone when we reach it, the tour continues or finishes gracefully without noise.
