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

type UseGlowTourResult = Pick<Tour, "advance" | "cancel" | "create" | "goTo" | "previous" | "start"> &
  TourState & { readonly tour: Tour }
```

**Parameters**:
- `source` - Options for a new tour, or an existing tour created with `createGlowTour()` to share it.

With options, the tour is created once, on the first render, and released with its root when the component unmounts; call `tour.dispose()` to end it explicitly. With a tour, the hook only reads it.

**Usage**:
```tsx
import { GlowTourDefault, useGlowTour } from "@glowhop/react-tour";

function Onboarding() {
  const { tour, create, start, status } = useGlowTour();

  function startTour() {
    void start(create("welcome").step({ id: "search", target: '[data-tour="search"]', content: "Find anything here." }).build());
  }

  return (
    <>
      <button disabled={status === "active"} onClick={startTour}>Start tour</button>
      <GlowTourDefault tour={tour} />
    </>
  );
}
```

See the guide to [choose step targets](/docs/guides/react#step-targets) and [share one tour between components](/docs/guides/react#share-one-tour-between-components).

### `useGlowTourContext()`

Reads the state of the tour rendered by the enclosing `GlowTourRoot`, to build tour UI inside the root. To run a tour or read its state elsewhere, use `useGlowTour`.

Returns reactive tour state. Must be called inside `<GlowTourRoot tour={...}>`.

**Signature**:
```typescript
function useGlowTourContext(): TourState<ReactTourContent>
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
const state = useGlowTourContext();

return (
  <p>
    Step {state.currentStepIndex + 1} of {state.totalSteps}
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
import { GlowTour } from "@glowhop/react-tour";

<GlowTour.Root tour={tour}>
  <GlowTour.Popover>
    <GlowTour.Content />
  </GlowTour.Popover>
</GlowTour.Root>;
```

`GlowTourDefault` is not part of the `GlowTour` object. The named exports stay the tree-shakeable choice: using `GlowTour` includes every composition component in your bundle.

### Component props

Every composition component must be rendered inside `GlowTourRoot`, which is the only one that receives the tour. Each component also accepts the standard attributes of the element it renders (`className`, `style`, `data-*`, event handlers, …), except the attributes it manages itself, such as `id`, `ref`, `role`, and its ARIA attributes.

| Component | Renders | Props |
| --- | --- | --- |
| `GlowTourRoot` | `<div>` | `tour: Tour` (required), `idPrefix?: string`, `children?: ReactNode` |
| `GlowTourOverlay` | `<svg>` | `children?: ReactNode` (extra SVG content), SVG attributes |
| `GlowTourPointer` | `<div>` | `directionContent?: PointerDirectionContent` |
| `GlowTourPopover` | `<section>` | `children?: ReactNode` |
| `GlowTourHeader` | `<header>` | No children: renders the step `title`, and nothing when the step has no title |
| `GlowTourContent` | `<div>` | No children: renders the step `content` in a polite live region |
| `GlowTourFooter` | `<footer>` | `children?: ReactNode` |
| `GlowTourPreviousTrigger` | `<button>` | `previousLabel?: string` (default `"Previous step"`), trigger props |
| `GlowTourAdvanceTrigger` | `<button>` | `advanceLabel?: string` (default `"Advance step"`), `finishLabel?: string` (default `"Finish tour"`, on the last step), trigger props |
| `GlowTourCancelTrigger` | `<button>` | Trigger props. Its label is `"Skip"` |

`idPrefix` sets the prefix of the ids the root generates for ARIA relationships. Set it when a page renders several tours.

**Trigger props**: every button attribute except `type`, plus `children`. The label is used as the button text and as its default `aria-label`. `children` replaces the default `<button>`:

- a single element, such as `<MyButton />`, receives the trigger's props through `cloneElement` and keeps its own `onClick`, `className`, and `disabled`;
- a function receives the trigger's props and returns the element to render.

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
  top?: React.ReactNode
  bottom?: React.ReactNode
  left?: React.ReactNode
  right?: React.ReactNode
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

**Usage** (default glyphs):
```tsx
<GlowTourPointer />
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
