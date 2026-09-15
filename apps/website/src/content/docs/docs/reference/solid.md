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

### `GlowTourDefault`

Pre-composed tour with overlay, popover, pointer, and all navigation buttons.

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

### `useTour()`

Returns reactive tour state via Solid signals. Must be called inside `<GlowTourRoot tour={...}>`.

**Signature**:
```typescript
function useTour(): Accessor<TourState<SolidTourContent>>
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
import { useTour } from "@glowhop/solid-tour";

const state = useTour();

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
