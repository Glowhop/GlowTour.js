---
title: Tour API reference
description: Complete reference for the Glow Tour controller — the instance returned by createGlowTour.
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

### `tour.run(workflow)`

Runs a workflow built with `.build()`. Any previous run or navigation on this controller is cancelled first.

**Signature**:
```typescript
run(workflow: WorkflowDefinition): Promise<void>
```

**Usage**:
```typescript
const workflow = tour.create("welcome").step({ target: "#save-button", title: "Save", content: "Click here to save." }).build();

await tour.run(workflow);
```

### `tour.advance()`

Moves to the next step. Only available if `canAdvance` is true — check `tour.state.get().canAdvance` or the state a `subscribe` listener receives before calling it, or wire it to a button's `disabled` prop.

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
  Back
</button>
```

### `tour.goToStep(index)`

Jumps to a specific step by index, skipping the steps in between.

**Signature**:
```typescript
goToStep(index: number): Promise<void>
```

**Usage**:
```typescript
// Jump straight to the fourth step (0-indexed)
await tour.goToStep(3);
```

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

Cancels pending work and releases the connected root. The controller becomes unusable after this — create a new one with `createGlowTour()` if you need another tour.

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

Returns the current tour state as a plain snapshot (not reactive by itself — use `subscribe` below to react to changes).

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
- `TourState` - Immutable state object returned by `tour.state.get()`
- `TourCurrentStep` - The active step's target and props, part of `TourState`

See the [Builder reference](/docs/reference/builder) for `tour.create()`'s workflow/step-building API and every option's default value.
