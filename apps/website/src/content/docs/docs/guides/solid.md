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
import { GlowTourDefault, useGlowTour } from "@glowhop/solid-tour";
```

## Run a tour from a component

`useGlowTour()` creates a tour for the component and returns everything needed to drive it: the `tour` to render, its methods (`create`, `run`, `advance`, `previous`, `goTo`, `cancel`), and one accessor per state field.

```tsx
import { Show } from "solid-js";
import { render } from "solid-js/web";
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, useGlowTour } from "@glowhop/solid-tour";

function TourApp() {
  const { tour, create, run, cancel, status, currentStepIndex, totalSteps } = useGlowTour();

  const workflow = create("product-tour")
    .step({
      id: "features",
      target: '[data-tour="features"]',
      title: "Explore features",
      content: "Learn about all the capabilities.",
    })
    .step({
      id: "pricing",
      target: '[data-tour="pricing"]',
      title: "Check pricing",
      content: "See plans that fit your needs.",
    })
    .build();

  return (
    <>
      <main>
        <section data-tour="features">
          <h2>Features</h2>
          <p>We offer guided tours, SSR support, and full keyboard navigation.</p>
        </section>
        <section data-tour="pricing">
          <h2>Pricing</h2>
          <p>Open source and free.</p>
        </section>
        <Show
          when={status() === "active"}
          fallback={<button onClick={() => void run(workflow)}>Start tour</button>}
        >
          <p>
            Step {currentStepIndex() + 1} of {totalSteps()} <button onClick={() => void cancel()}>Stop</button>
          </p>
        </Show>
      </main>
      <GlowTourDefault tour={tour} />
    </>
  );
}

render(() => <TourApp />, document.getElementById("app")!);
```

The tour is disposed when the component's owner is cleaned up.

## Share a tour with `createGlowTour`

When several components drive the same tour, or code outside components needs it, create the tour yourself and pass it to `useGlowTour`:

```tsx
// tour.ts
import { createGlowTour } from "@glowhop/solid-tour";

export const tour = createGlowTour();
```

```tsx
import { GlowTourDefault, useGlowTour } from "@glowhop/solid-tour";
import { tour } from "./tour";

export function App() {
  return (
    <>
      <HelpButton />
      <GlowTourDefault tour={tour} />
    </>
  );
}

function HelpButton() {
  const { status } = useGlowTour(tour);
  return <button disabled={status() === "active"}>Help</button>;
}
```

`useGlowTour(tour)` reads a tour it is given and never disposes it. Outside components, drive the same instance directly with `tour.run(workflow)`, `tour.cancel()`, and `tour.state`.

## Step targets

A step's `target` is the element the tour highlights. It accepts three forms:

| Form | Example | Use it for |
|---|---|---|
| CSS selector | `'[data-tour="pricing"]'`, `"#pricing"` | Markup you render yourself |
| Function | `() => element` | A ref, or an element that appears later |
| `HTMLElement` | `document.body` | An element that already exists when the workflow is built |

Selectors and functions are resolved each time the step is entered, not when the workflow is built.

### Mark elements with `data-tour`

Ids break as soon as a component renders twice, and classes change with styling. A dedicated attribute states the intent and survives both:

```html
<section data-tour="pricing">
  <h2>Pricing</h2>
</section>
```

```ts
.step({ id: "pricing", target: '[data-tour="pricing"]', title: "Pricing", content: "Pick a plan." })
```

A selector matches the first element in the document, wherever it is rendered, so it keeps working with portals. When a component renders several times, target the one you mean through a ref.

### Target a ref through a function

Wrap the ref in a function. The function runs when the step is entered, after the component has mounted, so it reads the rendered element:

```tsx
import { GlowTourDefault, useGlowTour } from "@glowhop/solid-tour";

export function Checkout() {
  let payButton: HTMLButtonElement | undefined;
  const { tour, create, run } = useGlowTour();

  const workflow = create("checkout")
    .step({
      id: "pay",
      target: () => payButton ?? null,
      title: "Pay",
      content: "Confirm your order here.",
    })
    .build();

  return (
    <>
      <button ref={payButton}>Pay</button>
      <button onClick={() => void run(workflow)}>Show me</button>
      <GlowTourDefault tour={tour} />
    </>
  );
}
```

Do not read the ref while building the workflow (`target: payButton`): the element is not rendered yet, so the step would get nothing.

### Wait for an element that appears later

The function can return a promise, for content that loads or opens after the tour has started. It receives a `signal` that aborts when the tour is cancelled or disposed, so a pending wait can stop:

```ts
.step({
  id: "results",
  target: async ({ signal }) => {
    await loadResults({ signal }); // your own async work
    return document.querySelector<HTMLElement>('[data-tour="results"]');
  },
  title: "Results",
  content: "Your matches appear here.",
})
```

### When no element is found

A selector that matches nothing, a function that returns `null`, or an element that is no longer in the page makes the step follow `behavior.missingTarget`. By default the tour fails with an error. Use `"wait"` to resolve the target again every 16 ms until a timeout (a function target is called each time, so keep it cheap), `"skip"` to move past the step, or `"detached"` to show the popover centered on the screen. See [Handling errors](/docs/guides/handling-errors#missing-target-strategies).

The target must be an HTML element of the page: an SVG element makes the tour fail with a `TypeError`. To highlight an SVG graphic, target its HTML container.

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

The same layout can use the `GlowTour` object, which groups the composition components without their prefix:

```tsx
import { GlowTour } from "@glowhop/solid-tour";

export function CustomTour() {
  return (
    <GlowTour.Root tour={tour}>
      <GlowTour.Overlay />
      <GlowTour.Pointer />
      <GlowTour.Popover>
        <GlowTour.Header />
        <GlowTour.Content />
        <GlowTour.Footer>
          <GlowTour.CancelTrigger />
          <GlowTour.PreviousTrigger />
          <GlowTour.AdvanceTrigger />
        </GlowTour.Footer>
      </GlowTour.Popover>
    </GlowTour.Root>
  );
}
```

The object brings every composition component into your bundle. Import components by name to keep only the ones you use.

### Add a custom step counter

`useGlowTour()` gives state to the component that starts the tour. Components rendered inside `GlowTourRoot` read the same state with `useTourContext()`, without receiving the tour. Add this small component to the popover from the previous example:

```tsx
import { Show } from "solid-js";
import { useTourContext } from "@glowhop/solid-tour";

function StepCounter() {
  const state = useTourContext();

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

## Solid 1.8+

GlowTour.js requires Solid 1.8 or later. The adapter uses Solid's Context API and signals for state management.

## SSR

`GlowTourDefault` supports server-side rendering. The component renders as an inert container on the server and hydrates correctly on the client. See the SSR guide for details.
