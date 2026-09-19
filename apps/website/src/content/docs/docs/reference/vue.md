---
title: Vue API reference
description: API reference for @glowhop/vue-tour.
---

The Vue adapter (`@glowhop/vue-tour`) exports components, hooks, and utility functions.

## Hooks

### `useGlowTour(source?)`

Runs a tour from a component. This is the main entry point: it returns the tour to render, its methods, and one readonly ref per state field.

**Signature**:
```typescript
function useGlowTour(source?: GlowTourOptions | Tour): UseGlowTourResult

type UseGlowTourResult = Pick<Tour, "advance" | "cancel" | "create" | "goTo" | "previous" | "start"> & {
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

const { tour, create, start, status } = useGlowTour();
const workflow = create("welcome")
  .step({ id: "search", target: '[data-tour="search"]', content: "Find anything here." })
  .build();
</script>

<template>
  <button :disabled="status === 'active'" @click="start(workflow)">Start tour</button>
  <GlowTourDefault :tour="tour" />
</template>
```

See the guide to [choose step targets](/docs/guides/vue#step-targets) and [share one tour between components](/docs/guides/vue#share-one-tour-between-components).

### `useGlowTourContext()`

Reads the state of the tour rendered by the enclosing `GlowTourRoot`, to build tour UI inside the root. To run a tour or read its state elsewhere, use `useGlowTour`.

Returns reactive tour state as a ref. Must be called inside `<GlowTourRoot tour={...}>`.

**Signature**:
```typescript
function useGlowTourContext(): ShallowRef<TourState<VueTourContent>>
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
import { useGlowTourContext } from "@glowhop/vue-tour";

const state = useGlowTourContext();
</script>

<template>
  <p>Step {{ state.currentStepIndex + 1 }} of {{ state.totalSteps }}</p>
</template>
```

## Functions

### `createGlowTour(options?)`

Creates a tour instance to share between components, passed to `useGlowTour(tour)`, or to drive outside components. Inherited from Core.

**Signature**:
```typescript
function createGlowTour(options?: GlowTourOptions): Tour
```

## Components

### `GlowTourDefault`

Complete tour: overlay, pointer, popover, header, content, and the three navigation controls.

**Props**:
```typescript
interface GlowTourDefaultProps {
  tour: Tour
  idPrefix?: string // Prefix for internal element IDs
}
```

**Usage**:
```vue
<GlowTourDefault :tour="tour" />
```

### Composition components

Primitives for custom layouts:

- `GlowTourRoot` - Root container
- `GlowTourOverlay` - Backdrop overlay
- `GlowTourPointer` - Decorative pointer indicator (not the popover arrow)
- `GlowTourPopover` - Dialog container
- `GlowTourHeader` - Title area
- `GlowTourContent` - Description area
- `GlowTourFooter` - Navigation button container
- `GlowTourAdvanceTrigger` - Next step button
- `GlowTourPreviousTrigger` - Previous step button
- `GlowTourCancelTrigger` - Cancel button, labelled "Skip"

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

### Component props

Every composition component must be rendered inside `GlowTourRoot`, which is the only one that receives the tour. Attributes that are not props (`class`, `style`, `data-*`, listeners, …) are forwarded to the rendered element, except the attributes each component manages itself, such as `id` and its ARIA relationships.

| Component | Renders | Props | Slot |
| --- | --- | --- | --- |
| `GlowTourRoot` | `<section>` | `tour: Tour` (required), `idPrefix?: string` | default |
| `GlowTourOverlay` | `<svg>` | `ariaHidden?: boolean` (default `true`), `focusable?: string` (default `"false"`), `viewBox?: string` (default `"0 0 0 0"`) | default, extra SVG content |
| `GlowTourPointer` | `<div>` | `directionContent?: PointerDirectionContent` | - |
| `GlowTourPopover` | `<section>` | `role?: string` (default `"dialog"`) | default |
| `GlowTourHeader` | `<header>` | - | - (renders the step `title`, and nothing when the step has no title) |
| `GlowTourContent` | `<div>` | `ariaLive?: string` (default `"polite"`) | - (renders the step `content`) |
| `GlowTourFooter` | `<footer>` | - | default |
| `GlowTourPreviousTrigger` | `<button>` | `previousLabel?: string` (default `"Previous step"`), `ariaLabel?: string` | default, trigger slot |
| `GlowTourAdvanceTrigger` | `<button>` | `advanceLabel?: string` (default `"Advance step"`), `finishLabel?: string` (default `"Finish tour"`, on the last step), `ariaLabel?: string` | default, trigger slot |
| `GlowTourCancelTrigger` | `<button>` | `ariaLabel?: string` | default, trigger slot. Its label is `"Skip"` |

`idPrefix` sets the prefix of the ids the root generates for ARIA relationships. Set it when a page renders several tours.

**Triggers**: the label is the button text and, without `ariaLabel` or an `aria-label` attribute, its accessible name. The default slot replaces the button text and receives the trigger's button props (`disabled`, `aria-label`, …):

```vue
<GlowTourAdvanceTrigger advance-label="Next" finish-label="Done" v-slot="{ 'aria-label': label }">
  <span class="icon-arrow" aria-hidden="true" /> {{ label }}
</GlowTourAdvanceTrigger>
```

A `disabled` attribute adds to the tour's own state: a trigger is also disabled when its navigation is not available, or when the step sets its control to `"disabled"`. To hide a trigger, see [Hiding a control's button](/docs/reference/builder#hiding-a-controls-button).

### `GlowTourPointer`

Customizes the directional content (emoji or custom content) of the pointer indicator.

```typescript
interface PointerDirectionContent {
  top?: VNodeChild
  bottom?: VNodeChild
  left?: VNodeChild
  right?: VNodeChild
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

**Usage** (default glyphs):
```vue
<GlowTourPointer />
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
