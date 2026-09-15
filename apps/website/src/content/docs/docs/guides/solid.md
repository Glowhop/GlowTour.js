---
title: Solid guide
description: Build guided tours with @glowhop/solid-tour.
---

The GlowTour.js Solid adapter provides components and a Context-scoped tour instance using Solid's reactivity model. Content is normal Solid JSX.

## Setup

Install the package and import the default theme:

```bash
npm i @glowhop/solid-tour @glowhop/styles-tour
```

```tsx
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, createGlowTour } from "@glowhop/solid-tour";
```

## Instance scoping

Create the tour instance at the top level of your app:

```tsx
import { createGlowTour } from "@glowhop/solid-tour";

export const tour = createGlowTour();
```

Then mount the `GlowTourDefault` component in your app:

```tsx
import { GlowTourDefault } from "@glowhop/solid-tour";
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
import { render } from "solid-js/web";
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, createGlowTour } from "@glowhop/solid-tour";

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

function TourApp() {
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

render(() => <TourApp />, document.getElementById("app")!);
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
} from "@glowhop/solid-tour";

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
import { Show } from "solid-js";
import { useTour } from "@glowhop/solid-tour";

function StepCounter() {
  const state = useTour();

  return (
    <Show when={state().currentStepIndex >= 0 && state().totalSteps > 0}>
      <p>
        Step {state().currentStepIndex + 1} of {state().totalSteps}
      </p>
    </Show>
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

`useTour()` is intended for descendants of `GlowTourRoot`. Elsewhere in a Solid application, adapt the store to a signal and dispose the subscription with the component owner:

```tsx
import { createSignal, onCleanup } from "solid-js";

function useTourState() {
  const [state, setState] = createSignal(tour.state.get());
  onCleanup(tour.state.subscribe(setState));
  return state;
}

function TourStatus() {
  const state = useTourState();
  return <p>Tour status: {state().status}</p>;
}
```

`tour.state.get()` returns the current snapshot. `tour.state.subscribe(listener)` returns the cleanup function passed to `onCleanup`. See [Programmatic control](/docs/guides/programmatic-control) for the complete state contract.

## Solid 1.8+

GlowTour.js requires Solid 1.8 or later. The adapter uses Solid's Context API and signals for state management.

## SSR

`GlowTourDefault` supports server-side rendering. The component renders as an inert container on the server and hydrates correctly on the client. See the SSR guide for details.
