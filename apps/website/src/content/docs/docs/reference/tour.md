---
title: Tour API reference
description: Complete reference for the GlowTour.js controller - the instance returned by createGlowTour.
---

`createGlowTour()` returns a tour controller: the long-lived instance that creates workflows (via `tour.create()`, see the [Builder reference](/docs/reference/builder)), runs them, drives navigation, and exposes reactive state. One controller can be connected to one live root at a time.

For framework-specific integration and components, see [React](/docs/reference/react), [Vue](/docs/reference/vue), [Solid](/docs/reference/solid), [Angular](/docs/reference/angular), or [Vanilla](/docs/reference/vanilla).

## Functions

### `createGlowTour(options?)`

Creates and returns a new tour controller instance.

**Signature**:
```typescript
function createGlowTour(options?: GlowTourOptions): GlowTour
```

**Parameters**:
- `options.onSubscriberError` - Called when a state/step subscriber throws an error (optional, no default)
- `options.onEvent` - Monitoring callback for every tour this instance runs; see the [Monitoring guide](/docs/guides/monitoring) (optional, no default)

**Returns**: Tour controller instance

**Usage**:
```typescript
const tour = createGlowTour({
  onSubscriberError: (error) => {
    console.error("Subscriber error:", error);
  }
});
```

## Controller methods

### `tour.create(name, options?)`

Starts building a new workflow on this controller. See the [Builder reference](/docs/reference/builder#tourcreatename-options) for the full builder API.

**Signature**:
```typescript
create(name: string, options?: StartOptions): WorkflowBuilder
```

### `tour.start(workflow, options?)`

Runs a workflow built with `.build()`. Any previous run or navigation on this controller is cancelled first. The returned promise resolves once the first step is on screen, not when the tour ends, and rejects if that first step fails.

**Signature**:
```typescript
start(workflow: WorkflowDefinition, options?: RunOptions): Promise<void>
```

**Options**:
- `startAt` - Id of the step to start on, instead of the first one. Throws if no step carries that id. The workflow is not truncated: `totalSteps` is unchanged and `previous()` can go back before this step. See [Resuming a tour](/docs/guides/resuming).

**Usage**:
```typescript
const workflow = tour.create("welcome").step({ id: "save-button", target: "#save-button", title: "Save", content: "Click here to save." }).build();

await tour.start(workflow);
```

### `tour.advance()`

Moves to the next step. Only available if `canAdvance` is true - check `tour.state.get().canAdvance` or the state a `subscribe` listener receives before calling it, or wire it to a button's `disabled` prop.

**Signature**:
```typescript
advance(): Promise<void>
```

**Usage**:
```typescript
<button disabled={!state.canAdvance} onClick={() => tour.advance()}>
  Next
</button>
```

### `tour.previous()`

Moves to the previous step. Only available if `canPrevious` is true.

**Signature**:
```typescript
previous(): Promise<void>
```

**Usage**:
```typescript
<button disabled={!state.canPrevious} onClick={() => tour.previous()}>
  Previous
</button>
```

### `tour.goTo(id)`

Goes to the step with this `id`, skipping the steps in between. The direction (`"advance"` or `"previous"`) follows the position of that step. It does nothing while a transition is in progress or when that step is already shown, and it throws when no step has this `id`.

Steps are designated by `id`, like `startAt` in `start()`: an index would break as soon as steps are reordered or inserted.

**Signature**:
```typescript
goTo(id: string): Promise<void>
```

**Usage**:
```typescript
// Jump straight to the billing step
await tour.goTo("billing");
```

A step action or a target event handler can do the same with `context.goTo(id)`, which also stops the remaining actions of its step, like `context.advance()`.

### `tour.cancel()`

Cancels the running tour. Only available if `canCancel` is true (see `StartOptions.cancellable`, default `true`, in the [Builder reference](/docs/reference/builder#start-options)).

**Signature**:
```typescript
cancel(): Promise<void>
```

**Usage**:
```typescript
<button onClick={() => tour.cancel()}>Skip tour</button>
```

### `tour.dispose()`

Cancels pending work and releases the connected root. The controller becomes unusable after this - create a new one with `createGlowTour()` if you need another tour.

**Signature**:
```typescript
dispose(): void
```

**Usage**:
```typescript
// e.g. in a framework's unmount/cleanup hook
tour.dispose();
```

## State

### `tour.state.get()`

Returns the current tour state as a plain snapshot (not reactive by itself - use `subscribe` below to react to changes).

**Signature**:
```typescript
get(): TourState
```

**Usage**:
```typescript
const { status, canAdvance } = tour.state.get();
```

**Returns**:
```typescript
{
  status: "idle" | "starting" | "transitioning" | "active" | "finished" | "cancelled" | "error" | "disposed"
  name: string
  totalSteps: number
  currentStepIndex: number
  currentStep: TourCurrentStep | null
  direction: "advance" | "previous"
  canAdvance: boolean
  canPrevious: boolean
  canCancel: boolean
  isFirstStep: boolean
  isLastStep: boolean
  error: Error | null
}
```

### `tour.state.subscribe(listener)`

Subscribes to state changes. Called whenever any part of the state changes.

**Signature**:
```typescript
subscribe(listener: (state: TourState) => void): () => void
```

**Returns**: Unsubscribe function

**Usage**:
```typescript
const unsubscribe = tour.state.subscribe((state) => {
  console.log("Tour status:", state.status);
  if (state.status === "finished") {
    unsubscribe();
  }
});
```

## Types

Controller-related type exports for TypeScript users:

- `GlowTour` - Tour controller interface
- `GlowTourOptions` - Options for `createGlowTour`
- `TourEvent`, `TourEventListener`, `TourEventType`, `TourEventSource` - The monitoring contract; see the [Monitoring guide](/docs/guides/monitoring)
- `TourState` - Immutable state object returned by `tour.state.get()`
- `TourCurrentStep` - The active step's target and props, part of `TourState`

`TourStatus`, `TourEventType`, and `TourEventSource` are unions that can gain members in a minor release. When you switch over them, keep a default branch.

See the [Builder reference](/docs/reference/builder) for `tour.create()`'s workflow/step-building API and every option's default value.
