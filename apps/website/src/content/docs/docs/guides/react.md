---
title: React guide
description: Build guided tours with @glowhop/react-tour.
---

The GlowTour.js React adapter provides native React components and a Context-scoped tour instance. No portals to wire up yourself - `GlowTourDefault` renders the complete UI for you.

## Setup

Install the package and import the default theme:

```bash
npm i @glowhop/react-tour @glowhop/styles-tour
```

```tsx
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, createGlowTour } from "@glowhop/react-tour";
```

## Instance scoping

The tour instance is scoped to React Context. Create the tour at the top level of your app or in a context provider:

```tsx
import { createGlowTour } from "@glowhop/react-tour";

export const tour = createGlowTour();
```

Then mount the `GlowTourDefault` component near your app root:

```tsx
import { GlowTourDefault } from "@glowhop/react-tour";
import { tour } from "./tour";

export function App() {
  return (
    <>
      {/* Your app content */}
      <GlowTourDefault tour={tour} />
    </>
  );
}
```

## Complete example

```tsx
import { createRoot } from "react-dom/client";
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, createGlowTour } from "@glowhop/react-tour";

const tour = createGlowTour();

const workflow = tour
  .create("product-tour")
  .step({
    id: "features",
    target: "#features",
    title: "Explore features",
    content: "Learn about all the capabilities.",
  })
  .step({
    id: "pricing",
    target: "#pricing",
    title: "Check pricing",
    content: "See plans that fit your needs.",
  })
  .build();

export function TourApp() {
  return (
    <>
      <header>
        <h1>Welcome</h1>
      </header>
      <main>
        <section id="features">
          <h2>Features</h2>
          <p>We offer guided tours, SSR support, and full keyboard navigation.</p>
        </section>
        <section id="pricing">
          <h2>Pricing</h2>
          <p>Open source and free.</p>
        </section>
        <button onClick={() => void tour.run(workflow)}>Start tour</button>
      </main>
      <GlowTourDefault tour={tour} />
    </>
  );
}

createRoot(document.getElementById("app")!).render(<TourApp />);
```

## Customize progressively

`GlowTourDefault` is the shortest path to a complete tour. Keep it while you only need visual changes, then move to composition when you need to change the popover structure.

### Style `GlowTourDefault` with CSS

The default component reads the theme's CSS custom properties, so colors, spacing, and shape can change without replacing any components:

```css
:where([data-glow-tour-root]) {
  --glow-tour-color-accent: #7c3aed;
  --glow-tour-color-surface: #faf5ff;
  --glow-tour-radius: 16px;
}
```

Keep rendering `<GlowTourDefault tour={tour} />`. See the [theming guide](/docs/guides/theming) for all available tokens.

### Compose the default layout

When you need to add, remove, or rearrange content, expand `GlowTourDefault` into the primitives it assembles for you:

```tsx
import {
  GlowTourAdvanceTrigger,
  GlowTourCancelTrigger,
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourOverlay,
  GlowTourPointer,
  GlowTourPopover,
  GlowTourPreviousTrigger,
  GlowTourRoot,
} from "@glowhop/react-tour";

export function CustomTour() {
  return (
    <GlowTourRoot tour={tour}>
      <GlowTourOverlay />
      <GlowTourPointer />
      <GlowTourPopover>
        <GlowTourHeader />
        <GlowTourContent />
        <GlowTourFooter>
          <GlowTourCancelTrigger />
          <GlowTourPreviousTrigger />
          <GlowTourAdvanceTrigger />
        </GlowTourFooter>
      </GlowTourPopover>
    </GlowTourRoot>
  );
}
```

### Add a custom step counter

Components rendered inside `GlowTourRoot` can read its reactive state with `useTour()`. Add this small component to the popover from the previous example:

```tsx
import { useTour } from "@glowhop/react-tour";

function StepCounter() {
  const state = useTour();

  if (state.currentStepIndex < 0 || state.totalSteps === 0) return null;

  return (
    <p>
      Step {state.currentStepIndex + 1} of {state.totalSteps}
    </p>
  );
}
```

```tsx
<GlowTourPopover>
  <GlowTourHeader />
  <StepCounter />
  <GlowTourContent />
  {/* Keep the same footer as above. */}
</GlowTourPopover>
```

To have assistive technologies announce the complete counter when it changes, you can add `aria-live="polite"` and `aria-atomic="true"` to the `<p>`. `GlowTourContent` is already a polite live region, so enable a second one only when the counter conveys useful distinct information, and test the result with a screen reader.

See the runnable [Live step counter example](/examples).

### Subscribe outside the composition

`useTour()` is intended for descendants of `GlowTourRoot`. Elsewhere in a React application, connect directly to the tour's external store with `useSyncExternalStore`:

```tsx
import { useSyncExternalStore } from "react";

function TourStatus() {
  const state = useSyncExternalStore(
    tour.state.subscribe,
    tour.state.get,
    tour.state.get,
  );

  return <p>Tour status: {state.status}</p>;
}
```

`tour.state.get()` returns the current snapshot. `tour.state.subscribe(listener)` returns an unsubscribe function, which React manages for this hook. See [Programmatic control](/docs/guides/programmatic-control) for the complete state contract.

## React 18 vs 19

GlowTour.js supports both React 18 and 19. The adapter uses `useSyncExternalStore` for state management and works identically across both versions. No changes are needed when upgrading.

## SSR

`GlowTourDefault` supports static server-side rendering. The component renders as an inert container on the server and hydrates without errors on the client. See the SSR guide for details.
