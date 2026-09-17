---
title: Solid API reference
description: API reference for @glowhop/solid-tour.
---

The Solid adapter (`@glowhop/solid-tour`) exports components, hooks, and utility functions.

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

See the guide to [choose step targets](/docs/guides/solid#step-targets) and [share one tour between components](/docs/guides/solid#share-one-tour-between-components).

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
  <p>
    Step {state().currentStepIndex + 1} of {state().totalSteps}
  </p>
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
```tsx
<GlowTourDefault tour={tour} />
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

```tsx
import { GlowTour } from "@glowhop/solid-tour";

<GlowTour.Root tour={tour}>
  <GlowTour.Popover>
    <GlowTour.Content />
  </GlowTour.Popover>
</GlowTour.Root>;
```

`GlowTourDefault` is not part of the `GlowTour` object. The named exports stay the tree-shakeable choice: using `GlowTour` includes every composition component in your bundle.

### Component props

Every composition component must be rendered inside `GlowTourRoot`, which is the only one that receives the tour. Each component also accepts the standard attributes of the element it renders (`class`, `style`, `data-*`, event handlers, …), except the attributes it manages itself, such as `id`, `ref`, `role`, and its ARIA attributes.

| Component | Renders | Props |
| --- | --- | --- |
| `GlowTourRoot` | `<div>` | `tour: Tour` (required), `idPrefix?: string`, `children?: JSX.Element` |
| `GlowTourOverlay` | `<svg>` | `children?: JSX.Element` (extra SVG content), SVG attributes |
| `GlowTourPointer` | `<div>` | `as?: ValidComponent`, `directionContent?: PointerDirectionContent` |
| `GlowTourPopover` | `<section>` | `as?: ValidComponent`, `children?: JSX.Element` |
| `GlowTourHeader` | `<header>` | No children: renders the step `title`, and nothing when the step has no title |
| `GlowTourContent` | `<div>` | No children: renders the step `content` in a polite live region |
| `GlowTourFooter` | `<footer>` | `children?: JSX.Element` |
| `GlowTourPreviousTrigger` | `<button>` | `previousLabel?: string` (default `"Previous step"`), trigger props |
| `GlowTourAdvanceTrigger` | `<button>` | `advanceLabel?: string` (default `"Advance step"`), `finishLabel?: string` (default `"Finish tour"`, on the last step), trigger props |
| `GlowTourCancelTrigger` | `<button>` | Trigger props. Its label is `"Skip"`; it is not rendered when the tour cannot be cancelled |

`idPrefix` sets the prefix of the ids the root generates for ARIA relationships. Set it when a page renders several tours.

**Trigger props**: every button attribute except `type`, plus `children`. The label is used as the button text and as its default `aria-label`. To render your own element, pass a function as `children`: it receives the trigger's props and returns the element. An element passed directly as `children` is rejected by the types, because a Solid element cannot receive props after it is created.

```tsx
<GlowTourAdvanceTrigger advanceLabel="Next" finishLabel="Done">
  {(props) => <MyButton {...props}>{props["aria-label"]}</MyButton>}
</GlowTourAdvanceTrigger>
```

`disabled` adds to the tour's own state: a trigger is also disabled when its navigation is not available, or when the step sets its control to `"disabled"`. A control set to `"hidden"` is not rendered.

### `GlowTourPointer`

Customizes the directional content (emoji or custom content) of the pointer indicator.

```typescript
interface PointerDirectionContent {
  top?: JSX.Element
  bottom?: JSX.Element
  left?: JSX.Element
  right?: JSX.Element
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

**Usage** (default glyphs):
```tsx
<GlowTourPointer />
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
