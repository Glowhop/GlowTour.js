---
title: Solid guide
description: Build guided tours with @glowhop/solid-tour.
---

Glow Tour's Solid adapter provides components and a Context-scoped tour instance using Solid's reactivity model. Content is normal Solid JSX.

## Setup

Install the package and import the default theme:

```bash
bun add @glowhop/solid-tour @glowhop/styles-tour
```

```tsx
import "@glowhop/styles-tour/default.css";
import { DefaultTour, createGlowTour } from "@glowhop/solid-tour";
```

## Instance scoping

Create the tour instance at the top level of your app:

```tsx
import { createGlowTour } from "@glowhop/solid-tour";

export const tour = createGlowTour();
```

Then mount the `DefaultTour` component in your app:

```tsx
import { DefaultTour } from "@glowhop/solid-tour";
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
import { render } from "solid-js/web";
import "@glowhop/styles-tour/default.css";
import { DefaultTour, createGlowTour } from "@glowhop/solid-tour";

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
      <DefaultTour tour={tour} />
    </>
  );
}

render(() => <TourApp />, document.getElementById("app")!);
```

## Custom composition

Use `useTour()` hook and composition primitives to build a custom tour layout:

```tsx
import {
  GlowTour,
  createGlowTour,
  useTour,
} from "@glowhop/solid-tour";

const tour = createGlowTour();

export function CustomTour() {
  const tourState = useTour(tour);

  return (
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
  );
}
```

The `useTour()` hook returns reactive signals for fine-grained reactivity.

## Solid 1.8+

Glow Tour requires Solid 1.8 or later. The adapter uses Solid's Context API and signals for state management.

## SSR

`DefaultTour` supports server-side rendering. The component renders as an inert container on the server and hydrates correctly on the client. See the SSR guide for details.
