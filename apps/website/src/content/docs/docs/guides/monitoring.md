---
title: Monitoring a tour
description: Wire GlowTour.js to analytics with a single onEvent callback.
---

`onEvent` reports what a tour did: when it started, which steps were entered and
left, how long each took, what ended it, and what the user pressed to get there.
It is the callback to point at your analytics.

```ts
const tour = createGlowTour({
  onEvent: (event) => {
    analytics.track(event.type, {
      workflow: event.workflowName,
      step: event.stepId,
      position: `${event.stepIndex + 1}/${event.stepCount}`,
      source: event.source,
      ms: event.durationMs,
    });
  },
});
```

That is the whole integration. Registered on the instance, it covers every workflow
that instance runs - including workflows built from a [JSON config](/docs/guides/json-config).

## The events

| Event | Emitted |
| --- | --- |
| `tour:start` | Once `run()` has passed `onStart` without an abort, before the first step is shown |
| `step:enter` | Once a step is on screen and interactive |
| `step:leave` | When a step is left - moving on, going back, finishing, or cancelling |
| `tour:complete` | The tour ran past its last step |
| `tour:cancel` | The tour was cancelled |
| `tour:error` | The tour failed - see [Handling errors](/docs/guides/handling-errors) for response strategies |

A completed two-step tour emits, in order: `tour:start`, `step:enter`, `step:leave`,
`step:enter`, `step:leave`, `tour:complete`.

`tour:error` is not preceded by a `step:leave`: the step was not left, the tour died
on it. The event names that step, so the pair still reconciles in a funnel.

## The payload

Every event carries the same shape:

| Field | Meaning |
| --- | --- |
| `type` | Which event this is |
| `workflowName` | The name passed to `create()` |
| `stepId` | Id of the step the event is about, or `null` when none applies |
| `stepIndex` | Its 0-based position, or `-1` alongside a `null` `stepId` |
| `stepCount` | Total steps in the workflow |
| `direction` | `"advance"` or `"previous"` |
| `source` | What triggered the transition - see below |
| `timestamp` | `Date.now()` at emission |
| `durationMs` | How long the thing this event *names* had been running |
| `error` | The failure, on `tour:error` only |

`durationMs` follows one rule: it times whatever the event is named after. On
`step:leave`, that is the time spent on the step. On `tour:complete`, `tour:cancel`
and `tour:error`, the time since `run()`. On `tour:start` and `step:enter` - the
beginnings - it is always `0`.

### `source`

| Value | What the user did |
| --- | --- |
| `"trigger"` | Clicked a Next / Back / Cancel button |
| `"keyboard"` | Used a keyboard shortcut |
| `"overlay"` | Clicked the dimmed backdrop |
| `"api"` | Nothing - your own code called `advance()`, `previous()`, `goToStep()` or `cancel()`, including from inside a step action |

This is usually the field worth grouping on. A drop-off where `source` is `"overlay"`
is people trying to get out; the same drop-off on `"trigger"` is people reading the
step and choosing to leave.

## Two places to listen

`onEvent` exists on the instance, and on a single workflow:

```ts
const tour = createGlowTour({ onEvent: sendToAnalytics });

const workflow = tour
  .create("checkout-onboarding", { onEvent: countCheckoutSteps })
  .step({ id: "cart", target: "#cart", title: "Your cart", content: "…" })
  .build();
```

Both run, the instance one first. Use the instance for the wiring you want
everywhere, and the workflow one for something specific to that tour.

## It cannot break the tour

`onEvent` is monitoring, and only that:

- It cannot abort or delay a transition. Use `onStart` / `onCancel` / `onFinish` and
  their `abort()` for that.
- It is called synchronously and its return value is ignored - returning a promise
  will not make the tour wait.
- If it throws, the error goes to `onSubscriberError` (or the unhandled reporter) and
  the tour carries on. It never becomes the tour's own `error`.

When no listener is attached, nothing is built and no clock is read.

## Adapters

There is no separate React prop, Vue emit, or Angular output for this. Every adapter's
`createGlowTour` takes the same options object, so the callback above is already the
idiomatic form in all five:

```tsx
// React, Solid, Vue, Angular, Vanilla - the same call.
const tour = createGlowTour({ onEvent: sendToAnalytics });
```

## Resuming

There is no `tour:resume`. A resumed tour is a tour that starts on a different step,
and `tour:start` already says which one:

```ts
tour.run(workflow, { startAt: "invite" });
// tour:start  → stepId "invite", stepIndex 1
```

Treat a `tour:start` whose `stepIndex` is not `0` as a resume. See
[Resuming a tour](/docs/guides/resuming).
