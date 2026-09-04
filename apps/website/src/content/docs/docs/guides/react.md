---
title: React guide
description: Build guided tours with @glowhop/react-tour.
---

Glow Tour's React adapter provides native React components and a Context-scoped tour instance. No portals to wire up yourself — `DefaultTour` renders the complete UI for you.

## Setup

Install the package and import the default theme:

```bash
bun add @glowhop/react-tour @glowhop/styles-tour
```

```tsx
import "@glowhop/styles-tour/default.css";
import { DefaultTour, createGlowTour } from "@glowhop/react-tour";
```

## Instance scoping

The tour instance is scoped to React Context. Create the tour at the top level of your app or in a context provider:

```tsx
import { createGlowTour } from "@glowhop/react-tour";

export const tour = createGlowTour();
```

Then mount the `DefaultTour` component near your app root:

```tsx
import { DefaultTour } from "@glowhop/react-tour";
import { tour } from "./tour";

export function App() {
  return (
    <>
      {/* Your app content */}
      <DefaultTour tour={tour} />
    </>
  );
}
```

## Complete example

```tsx
import { createRoot } from "react-dom/client";
import "@glowhop/styles-tour/default.css";
import { DefaultTour, createGlowTour } from "@glowhop/react-tour";

const tour = createGlowTour();

const workflow = tour
  .create("product-tour")
  .step({
    target: "#features",
    title: "Explore features",
    content: "Learn about all the capabilities.",
  })
  .step({
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
      <DefaultTour tour={tour} />
    </>
  );
}

createRoot(document.getElementById("app")!).render(<TourApp />);
```

## Custom composition

Use `useTour()` hook and composition primitives to build a custom tour layout:

```tsx
import {
  GlowTour,
  createGlowTour,
  useTour,
} from "@glowhop/react-tour";

const tour = createGlowTour();

export function CustomTour() {
  const tourState = useTour(tour);

  return (
    <>
      <GlowTour.Root tour={tour}>
        <GlowTour.Overlay />
        <GlowTour.Pointer />
        <GlowTour.Popover>
          <GlowTour.Header />
          <GlowTour.Content />
          <GlowTour.Footer>
            <GlowTour.CancelTrigger />
            <GlowTour.AdvanceTrigger />
          </GlowTour.Footer>
        </GlowTour.Popover>
      </GlowTour.Root>
    </>
  );
}
```

The `useTour()` hook returns the reactive tour state for custom styling or logic.

## React 18 vs 19

Glow Tour supports both React 18 and 19. The adapter uses `useSyncExternalStore` for state management and works identically across both versions. No changes are needed when upgrading.

## SSR

`DefaultTour` supports static server-side rendering. The component renders as an inert container on the server and hydrates without errors on the client. See the SSR guide for details.
