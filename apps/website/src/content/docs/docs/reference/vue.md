---
title: Vue API reference
description: API reference for @glowhop/vue-tour.
---

The Vue adapter (`@glowhop/vue-tour`) exports components, hooks, and utility functions.

## Functions

### `createGlowTour(options?)`

Creates a tour controller instance. Inherited from Core.

**Signature**:
```typescript
function createGlowTour(options?: GlowTourOptions): Tour
```

## Components

### `GlowTourDefault`

Pre-composed tour with overlay, popover, pointer, and all navigation buttons.

**Props**:
```typescript
interface GlowTourDefaultProps {
  tour: Tour
}
```

**Usage**:
```vue
<GlowTourDefault :tour="tour" />
```

### `GlowTour*`

Composition primitives for custom layouts:

- `GlowTourRoot` - Root container
- `GlowTourOverlay` - Backdrop overlay
- `GlowTourPointer` - Decorative indicator/arrow
- `GlowTourPopover` - Dialog container
- `GlowTourHeader` - Title area
- `GlowTourContent` - Description area
- `GlowTourFooter` - Navigation button container
- `GlowTourAdvanceTrigger` - Next step button
- `GlowTourBackTrigger` - Previous step button
- `GlowTourCancelTrigger` - Dismiss button

These components are exported with both the `GlowTour*` naming convention shown above and as flat named exports: `GlowTourRoot`, `GlowTourOverlay`, `GlowTourPointer`, `GlowTourPopover`, `GlowTourHeader`, `GlowTourContent`, `GlowTourFooter`, `GlowTourAdvanceTrigger`, `GlowTourBackTrigger`, `GlowTourCancelTrigger`.

**Props** (GlowTourRoot):
```typescript
interface GlowTourRootProps {
  tour: Tour
  class?: string
  style?: CSSProperties
}
```

**Usage**:
```vue
<GlowTourRoot :tour="tour">
  <GlowTourOverlay />
  <GlowTourPointer />
  <GlowTourPopover>
    <GlowTourHeader />
    <GlowTourContent />
    <GlowTourFooter>
      <GlowTourCancelTrigger />
      <GlowTourAdvanceTrigger />
    </GlowTourFooter>
  </GlowTourPopover>
</GlowTourRoot>
```

## Hooks

### `useTour(tour)`

Returns reactive tour state as a ref.

**Signature**:
```typescript
function useTour(tour: Tour): Ref<TourState>
```

**Returns**:
```typescript
Ref<{
  status: "idle" | "active" | "completed" | "error"
  currentStep: TourCurrentStep | null
  canAdvance: boolean
  canPrevious: boolean
  canCancel: boolean
  error: Error | null
}>
```

**Usage**:
```vue
<script setup>
import { useTour } from "@glowhop/vue-tour";

const state = useTour(tour);
</script>

<template>
  <div>
    <p>Status: {{ state.status }}</p>
    <button :disabled="!state.canAdvance" @click="tour.advance()">
      Next
    </button>
  </div>
</template>
```

## Types

- `Tour` - Tour controller
- `TourState` - Tour state
- `WorkflowDefinition` - Immutable workflow
- `StepPropsStore` - Step state store
- `VueTourContent` - Vue content type
- `GlowTourOptions` - Options for `createGlowTour`
- `StartOptions` - Options for `tour.create`

## Exports

```typescript
export type { GlowTourOptions, StartOptions } from "@glowhop/core-tour";
export { GlowTourDefault } from "./components/default-tour.js";
export {
  GlowTourAdvanceTrigger,
  GlowTourBackTrigger,
  GlowTourCancelTrigger,
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourOverlay,
  GlowTourPointer,
  GlowTourPopover,
  GlowTourRoot,
  useTour,
} from "./components/tour-components.js";
export type {
  StepPropsStore,
  Tour,
  TourState,
  VueTourContent,
  WorkflowDefinition,
} from "./glow-tour.js";
export { createGlowTour } from "./glow-tour.js";
```
