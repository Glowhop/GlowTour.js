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

### `GlowTour*` and `GlowTour.*`

Composition primitives for custom layouts:

- `GlowTourRoot` - Root container
- `GlowTourOverlay` - Backdrop overlay
- `GlowTourPointer` - Decorative indicator/arrow
- `GlowTourPopover` - Dialog container
- `GlowTourHeader` - Title area
- `GlowTourContent` - Description area
- `GlowTourFooter` - Navigation button container
- `GlowTourAdvanceTrigger` - Next step button
- `GlowTourPreviousTrigger` - Previous step button
- `GlowTourCancelTrigger` - Dismiss button

The same components are grouped under the `GlowTour` object without their prefix (`Root`, `Overlay`, `Pointer`, `Popover`, `Header`, `Content`, `Footer`, `AdvanceTrigger`, `PreviousTrigger`, `CancelTrigger`), for compound markup:

```vue
<script setup>
import { GlowTour } from "@glowhop/vue-tour";
</script>

<template>
  <GlowTour.Root :tour="tour">
    <GlowTour.Popover>
      <GlowTour.Content />
    </GlowTour.Popover>
  </GlowTour.Root>
</template>
```

`GlowTourDefault` is not part of the `GlowTour` object. The named exports stay the tree-shakeable choice: using `GlowTour` includes every composition component in your bundle.

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
- `GlowTourPreviousTrigger` - Previous step button
- `GlowTourCancelTrigger` - Dismiss button

These components are exported with both the `GlowTour*` naming convention shown above and as flat named exports: `GlowTourRoot`, `GlowTourOverlay`, `GlowTourPointer`, `GlowTourPopover`, `GlowTourHeader`, `GlowTourContent`, `GlowTourFooter`, `GlowTourAdvanceTrigger`, `GlowTourPreviousTrigger`, `GlowTourCancelTrigger`.

**Props** (GlowTourRoot):
```typescript
interface GlowTourRootProps {
  tour: Tour
  class?: string
  style?: CSSProperties
}
```

### `GlowTourPointer` (detailed)

Customizes the directional content (emoji or custom content) of the pointer indicator.

**Props**:
```typescript
interface GlowTourPointerProps {
  directionContent?: {
    top?: VNodeChild
    bottom?: VNodeChild
    left?: VNodeChild
    right?: VNodeChild
  }
  class?: string
  style?: CSSProperties
}
```

**Default glyphs** (when `directionContent` is not set):
- `top`: `👆`
- `bottom`: `👇`
- `left`: `👈`
- `right`: `👉`

**Usage** (with custom content):
```vue
<GlowTourPointer
  :direction-content="{
    top: '⬆️',
    bottom: '⬇️',
    left: '⬅️',
    right: '➡️'
  }"
/>
```

**Usage** (with custom component):
```vue
<GlowTourPointer
  :direction-content="{
    bottom: SomeCustomComponent
  }"
/>
```

**Usage** (default pointers):
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

### `useGlowTour(source?)`

Runs a tour from a component. This is the main entry point: it returns the tour to render, its methods, and one readonly ref per state field.

**Signature**:
```typescript
function useGlowTour(source?: GlowTourOptions | Tour): UseGlowTourResult

type UseGlowTourResult = Pick<Tour, "advance" | "cancel" | "create" | "goTo" | "previous" | "run"> & {
  readonly tour: Tour
} & { readonly [K in keyof TourState]: Readonly<Ref<TourState[K]>> }
```

**Parameters**:
- `source` - Options for a new tour, or an existing tour created with `createGlowTour()` to share it.

With options, the tour is disposed when the calling effect scope is disposed. With a tour, the composable only reads it and never disposes it.

**Usage**:
```vue
<script setup lang="ts">
import { GlowTourDefault, useGlowTour } from "@glowhop/vue-tour";

const { tour, create, run, status } = useGlowTour();
const workflow = create("welcome")
  .step({ id: "search", target: '[data-tour="search"]', content: "Find anything here." })
  .build();
</script>

<template>
  <button :disabled="status === 'active'" @click="run(workflow)">Start tour</button>
  <GlowTourDefault :tour="tour" />
</template>
```

See the [guide](/docs/guides/vue#run-a-tour-from-a-component) for sharing a tour and choosing step targets.

### `useTourContext()`

Reads the state of the tour rendered by the enclosing `GlowTourRoot`, to build tour UI inside the root. To run a tour or read its state elsewhere, use `useGlowTour`.

Returns reactive tour state as a ref. Must be called inside `<GlowTourRoot tour={...}>`.

**Signature**:
```typescript
function useTourContext(): ShallowRef<TourState<VueTourContent>>
```

**Returns**:
```typescript
ShallowRef<{
  name: string
  totalSteps: number
  currentStepIndex: number
  currentStep: TourCurrentStep<VueTourContent> | null
  direction: "advance" | "previous"
  canAdvance: boolean
  canPrevious: boolean
  canCancel: boolean
  isFirstStep: boolean
  isLastStep: boolean
  status: "idle" | "starting" | "transitioning" | "active" | "finished" | "cancelled" | "error" | "disposed"
  error: Error | null
}>
```

**Usage**:
```vue
<script setup>
import { useTourContext } from "@glowhop/vue-tour";

const state = useTourContext();
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
- `UseGlowTourResult` - Value returned by `useGlowTour`
- `TourState` - Tour state
- `WorkflowDefinition` - Immutable workflow
- `StepPropsStore` - Step state store
- `VueTourContent` - Vue content type
- `PointerDirectionContent` - Content configuration for `GlowTourPointer` component directions
- `GlowTourOptions` - Options for `createGlowTour`
- `StartOptions` - Options for `tour.create`

## Exports

```typescript
export type { GlowTourOptions, StartOptions } from "@glowhop/core-tour";
export { GlowTourDefault } from "./components/default-tour.js";
export {
  GlowTourAdvanceTrigger,
  GlowTourPreviousTrigger,
  GlowTourCancelTrigger,
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourOverlay,
  GlowTourPointer,
  GlowTourPopover,
  GlowTourRoot,
  useTourContext,
} from "./components/tour-components.js";
export type {
  StepPropsStore,
  Tour,
  TourState,
  VueTourContent,
  WorkflowDefinition,
} from "./glow-tour.js";
export { createGlowTour } from "./glow-tour.js";
export { type UseGlowTourResult, useGlowTour } from "./use-glow-tour.js";
```
