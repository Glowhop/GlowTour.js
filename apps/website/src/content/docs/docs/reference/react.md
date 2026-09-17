---
title: React API reference
description: API reference for @glowhop/react-tour.
---

The React adapter (`@glowhop/react-tour`) exports components, hooks, and utility functions.

## Hooks

### `useGlowTour(source?)`

Runs a tour from a component. This is the main entry point: it returns the tour to render, its methods, and the current value of each state field.

**Signature**:
```typescript
function useGlowTour(source?: GlowTourOptions | Tour): UseGlowTourResult

type UseGlowTourResult = Pick<Tour, "advance" | "cancel" | "create" | "goTo" | "previous" | "run"> &
  TourState & { readonly tour: Tour }
```

**Parameters**:
- `source` - Options for a new tour, or an existing tour created with `createGlowTour()` to share it.

With options, the tour is created once, on the first render, and released with its root when the component unmounts; call `tour.dispose()` to end it explicitly. With a tour, the hook only reads it.

**Usage**:
```tsx
import { GlowTourDefault, useGlowTour } from "@glowhop/react-tour";

function Onboarding() {
  const { tour, create, run, status } = useGlowTour();

  function start() {
    void run(create("welcome").step({ id: "search", target: '[data-tour="search"]', content: "Find anything here." }).build());
  }

  return (
    <>
      <button disabled={status === "active"} onClick={start}>Start tour</button>
      <GlowTourDefault tour={tour} />
    </>
  );
}
```

See the guide to [choose step targets](/docs/guides/react#step-targets) and [share one tour between components](/docs/guides/react#share-one-tour-between-components).

### `useTourContext()`

Reads the state of the tour rendered by the enclosing `GlowTourRoot`, to build tour UI inside the root. To run a tour or read its state elsewhere, use `useGlowTour`.

Returns reactive tour state. Must be called inside `<GlowTourRoot tour={...}>`.

**Signature**:
```typescript
function useTourContext(): TourState<ReactTourContent>
```

**Returns**:
```typescript
{
  name: string
  totalSteps: number
  currentStepIndex: number
  currentStep: TourCurrentStep<ReactTourContent> | null
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
const state = useTourContext();

return (
  <div>
    <p>Status: {state.status}</p>
    <button disabled={!state.canAdvance} onClick={() => tour.advance()}>
      Next
    </button>
  </div>
);
```

## Functions

### `createGlowTour(options?)`

Creates a tour instance to share between components, passed to `useGlowTour(tour)`, or to drive outside components. Inherited from Core.

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
import { GlowTour } from "@glowhop/react-tour";

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

- `GlowTourRoot` - Root container (wraps the entire tour)
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
  className?: string
  style?: React.CSSProperties
}
```

### `GlowTourPointer` (detailed)

Customizes the directional content (emoji or custom content) of the pointer indicator.

**Props**:
```typescript
interface PointerProps extends ComponentProps {
  as?: React.ElementType
  directionContent?: {
    top?: React.ReactNode
    bottom?: React.ReactNode
    left?: React.ReactNode
    right?: React.ReactNode
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
    bottom: <svg>...</svg>
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

## Types

- `Tour` - Tour controller
- `UseGlowTourResult` - Value returned by `useGlowTour`
- `TourState` - Reactive tour state
- `WorkflowDefinition` - Immutable workflow
- `StepPropsStore` - Step state store
- `ReactTourContent` - React content type
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
  ReactTourContent,
  StepPropsStore,
  Tour,
  TourState,
  WorkflowDefinition,
} from "./glow-tour";
export { createGlowTour } from "./glow-tour";
export { type UseGlowTourResult, useGlowTour } from "./use-glow-tour";
```
