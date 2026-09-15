---
title: React API reference
description: API reference for @glowhop/react-tour.
---

The React adapter (`@glowhop/react-tour`) exports components, hooks, and utility functions.

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

## Hooks

### `useTour()`

Returns reactive tour state. Must be called inside `<GlowTourRoot tour={...}>`.

**Signature**:
```typescript
function useTour(): TourState<ReactTourContent>
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
const state = useTour();

return (
  <div>
    <p>Status: {state.status}</p>
    <button disabled={!state.canAdvance} onClick={() => tour.advance()}>
      Next
    </button>
  </div>
);
```

## Types

- `Tour` - Tour controller
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
  useTour,
} from "./components/tour-components";
export type {
  ReactTourContent,
  StepPropsStore,
  Tour,
  TourState,
  WorkflowDefinition,
} from "./glow-tour";
export { createGlowTour } from "./glow-tour";
```
