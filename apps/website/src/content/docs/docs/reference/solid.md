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

```tsx
import { GlowTour } from "@glowhop/solid-tour";

<GlowTour.Root tour={tour}>
  <GlowTour.Popover>
    <GlowTour.Content />
  </GlowTour.Popover>
</GlowTour.Root>;
```

`GlowTourDefault` is not part of the `GlowTour` object. The named exports stay the tree-shakeable choice: using `GlowTour` includes every composition component in your bundle.

**Props**:
```typescript
interface GlowTourDefaultProps {
  tour: Tour
}
```

**Usage**:
```tsx
<GlowTourDefault tour={tour} />
```

### `GlowTour.*`

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

These components are also available as flat named exports: `GlowTourRoot`, `GlowTourOverlay`, `GlowTourPointer`, `GlowTourPopover`, `GlowTourHeader`, `GlowTourContent`, `GlowTourFooter`, `GlowTourAdvanceTrigger`, `GlowTourPreviousTrigger`, `GlowTourCancelTrigger`.

**Props** (all components):
```typescript
interface ComponentProps {
  tour?: Tour
  class?: string
  style?: CSSProperties
}
```

### `GlowTourPointer` (detailed)

Customizes the directional content (emoji or custom content) of the pointer indicator.

**Props**:
```typescript
interface PointerProps extends ComponentProps {
  as?: ValidComponent
  directionContent?: {
    top?: JSX.Element
    bottom?: JSX.Element
    left?: JSX.Element
    right?: JSX.Element
  }
}
```

**Default glyphs** (when `directionContent` is not set):
- `top`: `👆`
- `bottom`: `👇`
- `left`: `👈`
- `right`: `👉`

**Usage** (with custom content):
```tsx
<GlowTourPointer
  directionContent={{
    top: "⬆️",
    bottom: "⬇️",
    left: "⬅️",
    right: "➡️"
  }}
/>
```

**Usage** (with custom element):
```tsx
<GlowTourPointer
  directionContent={{
    bottom: <span class="custom-pointer">↓</span>
  }}
/>
```

**Usage** (default pointers):
```tsx
<GlowTourRoot tour={tour}>
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

Runs a tour from a component. This is the main entry point: it returns the tour to render, its methods, and one accessor per state field.

**Signature**:
```typescript
function useGlowTour(source?: GlowTourOptions | Tour): UseGlowTourResult

type UseGlowTourResult = Pick<Tour, "advance" | "cancel" | "create" | "goTo" | "previous" | "run"> & {
  readonly tour: Tour
} & { readonly [K in keyof TourState]: Accessor<TourState[K]> }
```

**Parameters**:
- `source` - Options for a new tour, or an existing tour created with `createGlowTour()` to share it.

With options, the tour is disposed when the owning scope is cleaned up. With a tour, the hook only reads it and never disposes it.

**Usage**:
```tsx
import { GlowTourDefault, useGlowTour } from "@glowhop/solid-tour";

function Onboarding() {
  const { tour, create, run, status } = useGlowTour();
  const workflow = create("welcome")
    .step({ id: "search", target: '[data-tour="search"]', content: "Find anything here." })
    .build();

  return (
    <>
      <button disabled={status() === "active"} onClick={() => void run(workflow)}>Start tour</button>
      <GlowTourDefault tour={tour} />
    </>
  );
}
```

See the [guide](/docs/guides/solid#run-a-tour-from-a-component) for sharing a tour and choosing step targets.

### `useTourContext()`

Reads the state of the tour rendered by the enclosing `GlowTourRoot`, to build tour UI inside the root. To run a tour or read its state elsewhere, use `useGlowTour`.

Returns reactive tour state via Solid signals. Must be called inside `<GlowTourRoot tour={...}>`.

**Signature**:
```typescript
function useTourContext(): Accessor<TourState<SolidTourContent>>
```

**Returns** (accessor):
```typescript
() => {
  name: string
  totalSteps: number
  currentStepIndex: number
  currentStep: TourCurrentStep<SolidTourContent> | null
  direction: "advance" | "previous"
  canAdvance: boolean
  canPrevious: boolean
  canCancel: boolean
  isFirstStep: boolean
  isLastStep: boolean
  status: "idle" | "starting" | "transitioning" | "active" | "finished" | "cancelled" | "error" | "disposed"
  error: Error | null
}
```

**Usage**:
```tsx
import { useTourContext } from "@glowhop/solid-tour";

const state = useTourContext();

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
- `UseGlowTourResult` - Value returned by `useGlowTour`
- `TourState` - Tour state
- `WorkflowDefinition` - Immutable workflow
- `StepPropsStore` - Step state store
- `SolidTourContent` - Solid content type
- `PointerDirectionContent` - Content configuration for `GlowTourPointer` component directions
- `GlowTourOptions` - Options for `createGlowTour`
- `StartOptions` - Options for `tour.create`

## Exports

```typescript
export type { GlowTourOptions, StartOptions } from "@glowhop/core-tour";
export { GlowTourDefault, type GlowTourDefaultProps } from "./components/default-tour";
export {
  AdvanceTrigger,
  GlowTourPreviousTrigger,
  CancelTrigger,
  Content,
  Footer,
  GlowTour,
  Header,
  Overlay,
  Pointer,
  Popover,
  Root,
  useTourContext,
} from "./components/tour-components";
export type {
  SolidTourContent,
  StepPropsStore,
  Tour,
  TourState,
  WorkflowDefinition,
} from "./glow-tour";
export { createGlowTour } from "./glow-tour";
export { type UseGlowTourResult, useGlowTour } from "./use-glow-tour";
```
