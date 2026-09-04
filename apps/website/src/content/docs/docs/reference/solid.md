---
title: Solid API reference
description: API reference for @glowhop/solid-tour.
---

The Solid adapter (`@glowhop/solid-tour`) exports components, hooks, and utility functions.

## Functions

### `createGlowTour(options?)`

Creates a tour controller instance. Inherited from Core.

**Signature**:
```typescript
function createGlowTour(options?: GlowTourOptions): Tour
```

## Components

### `DefaultTour`

Pre-composed tour with overlay, popover, pointer, and all navigation buttons.

**Props**:
```typescript
interface DefaultTourProps {
  tour: Tour
}
```

**Usage**:
```tsx
<DefaultTour tour={tour} />
```

### `GlowTour.*`

Composition primitives for custom layouts:

- `GlowTour.Root` - Root container
- `GlowTour.Overlay` - Backdrop overlay
- `GlowTour.Pointer` - Decorative indicator/arrow
- `GlowTour.Popover` - Dialog container
- `GlowTour.Header` - Title area
- `GlowTour.Content` - Description area
- `GlowTour.Footer` - Navigation button container
- `GlowTour.AdvanceTrigger` - Next step button
- `GlowTour.BackTrigger` - Previous step button
- `GlowTour.CancelTrigger` - Dismiss button

These components are also available as flat named exports: `Root`, `Overlay`, `Pointer`, `Popover`, `Header`, `Content`, `Footer`, `AdvanceTrigger`, `BackTrigger`, `CancelTrigger`.

**Props** (all components):
```typescript
interface ComponentProps {
  tour?: Tour
  class?: string
  style?: CSSProperties
}
```

**Usage**:
```tsx
<GlowTour.Root tour={tour}>
  <GlowTour.Overlay />
  <GlowTour.Pointer />
  <GlowTour.Popover>
    <GlowTour.Header />
    <GlowTour.Content />
    <GlowTour.Footer>
      <GlowTour.CancelTrigger />
      <GlowTour.AdvanceTrigger />
    </GlowTour.Footer>
  </GlowTour.Popover>
</GlowTour.Root>
```

## Hooks

### `useTour(tour)`

Returns reactive tour state via Solid signals.

**Signature**:
```typescript
function useTour(tour: Tour): () => TourState
```

**Returns** (accessor):
```typescript
() => {
  status: "idle" | "active" | "completed" | "error"
  currentStep: TourCurrentStep | null
  canAdvance: boolean
  canPrevious: boolean
  canCancel: boolean
  error: Error | null
}
```

**Usage**:
```tsx
import { useTour } from "@glowhop/solid-tour";

const state = useTour(tour);

return (
  <div>
    <p>Status: {state().status}</p>
    <button disabled={!state().canAdvance} onClick={() => tour.advance()}>
      Next
    </button>
  </div>
);
```

## Types

- `Tour` - Tour controller
- `TourState` - Tour state
- `WorkflowDefinition` - Immutable workflow
- `StepPropsStore` - Step state store
- `SolidTourContent` - Solid content type
- `GlowTourOptions` - Options for `createGlowTour`
- `StartOptions` - Options for `tour.create`

## Exports

```typescript
export type { GlowTourOptions, StartOptions } from "@glowhop/core-tour";
export { DefaultTour, type DefaultTourProps } from "./components/default-tour";
export {
  AdvanceTrigger,
  BackTrigger,
  CancelTrigger,
  Content,
  Footer,
  GlowTour,
  Header,
  Overlay,
  Pointer,
  Popover,
  Root,
  useTour,
} from "./components/tour-components";
export type {
  SolidTourContent,
  StepPropsStore,
  Tour,
  TourState,
  WorkflowDefinition,
} from "./glow-tour";
export { createGlowTour } from "./glow-tour";
```
