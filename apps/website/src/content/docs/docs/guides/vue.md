---
title: Vue guide
description: Build guided tours with @glowhop/vue-tour.
---

The GlowTour.js Vue adapter provides components and a provide/inject instance scoped through the component tree. Content is normal Vue slot content.

## Setup

Install the adapter and the default theme. The theme is imported once, as shown in the example below.

```bash
npm i @glowhop/vue-tour @glowhop/styles-tour
```

## Run a tour from a component

`useGlowTour()` creates a tour for the component and returns everything needed to drive it: the `tour` to render, its methods (`create`, `start`, `advance`, `previous`, `goTo`, `cancel`), and one readonly ref per state field.

```vue
<script setup lang="ts">
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, useGlowTour } from "@glowhop/vue-tour";

const { tour, create, start, cancel, status, currentStepIndex, totalSteps } = useGlowTour();

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
</script>

<template>
  <main>
    <section data-tour="features">
      <h2>Features</h2>
      <p>We offer guided tours, SSR support, and full keyboard navigation.</p>
    </section>
    <section data-tour="pricing">
      <h2>Pricing</h2>
      <p>Open source and free.</p>
    </section>
    <p v-if="status === 'active'">
      Step {{ currentStepIndex + 1 }} of {{ totalSteps }}
      <button @click="cancel()">Stop</button>
    </p>
    <button v-else @click="start(workflow)">Start tour</button>
  </main>
  <GlowTourDefault :tour="tour" />
</template>
```

The tour is disposed when the component's effect scope is disposed. Destructured refs stay reactive, so templates read `status` directly and scripts read `status.value`.

To drive the same tour from several components, see [Share one tour between components](#share-one-tour-between-components).

## Step targets

A step's `target` is the element the tour highlights. It accepts three forms:

| Form | Example | Use it for |
|---|---|---|
| CSS selector | `'[data-tour="pricing"]'`, `"#pricing"` | Markup you render yourself |
| Function | `() => element` | A template ref, or an element that appears later |
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

A selector matches the first element in the document, wherever it is rendered, so it keeps working with `Teleport`. When a component renders several times, target the one you mean through a ref.

### Target a template ref through a function

Wrap the ref in a function. The function runs when the step is entered, after the component has mounted, so it reads the rendered element:

```vue
<script setup lang="ts">
import { useTemplateRef } from "vue";
import { GlowTourDefault, useGlowTour } from "@glowhop/vue-tour";

const payButton = useTemplateRef<HTMLButtonElement>("payButton");
const { tour, create, start } = useGlowTour();

const workflow = create("checkout")
  .step({
    id: "pay",
    target: () => payButton.value,
    title: "Pay",
    content: "Confirm your order here.",
  })
  .build();
</script>

<template>
  <button ref="payButton">Pay</button>
  <button @click="start(workflow)">Show me</button>
  <GlowTourDefault :tour="tour" />
</template>
```

`useTemplateRef` needs Vue 3.5. On Vue 3.3 and 3.4, declare `const payButton = ref<HTMLButtonElement | null>(null)` instead. For a child component, target its root element with `() => child.value?.$el`.

Do not read the ref while building the workflow (`target: payButton.value`): the element is not rendered yet, so the step would get nothing.

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

Keep rendering `<GlowTourDefault :tour="tour" />`. See the [theming guide](/docs/guides/theming) for all available tokens.

### Compose the default layout

When you need to add, remove, or rearrange content, expand `GlowTourDefault` into the components it assembles for you:

```vue
<script setup>
import {
  GlowTourRoot,
  GlowTourOverlay,
  GlowTourPointer,
  GlowTourPopover,
  GlowTourHeader,
  GlowTourContent,
  GlowTourFooter,
  GlowTourAdvanceTrigger,
  GlowTourPreviousTrigger,
  GlowTourCancelTrigger,
} from "@glowhop/vue-tour";
</script>

<template>
  <GlowTourRoot :tour="tour">
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
</template>
```

The same layout can use the `GlowTour` object, which groups the composition components without their prefix:

```vue
<script setup>
import { GlowTour } from "@glowhop/vue-tour";
</script>

<template>
  <GlowTour.Root :tour="tour">
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
</template>
```

The object brings every composition component into your bundle. Import components by name to keep only the ones you use.

### Add a custom step counter

`useGlowTour()` gives state to the component that starts the tour. Components rendered inside `GlowTourRoot` read the same state with `useGlowTourContext()`, without receiving the tour. Create the counter as a child component so the root context is available:

```vue
<!-- StepCounter.vue -->
<script setup lang="ts">
import { useGlowTourContext } from "@glowhop/vue-tour";

const state = useGlowTourContext();
</script>

<template>
  <p v-if="state.currentStepIndex >= 0 && state.totalSteps > 0">
    Step {{ state.currentStepIndex + 1 }} of {{ state.totalSteps }}
  </p>
</template>
```

Then place it in the composed popover:

```vue
<GlowTourPopover>
  <GlowTourHeader />
  <StepCounter />
  <GlowTourContent />
  <!-- Keep the same footer as above. -->
</GlowTourPopover>
```

To have assistive technologies announce the complete counter when it changes, you can add `aria-live="polite"` and `aria-atomic="true"` to the `<p>`. `GlowTourContent` is already a polite live region, so enable a second one only when the counter conveys useful distinct information, and test the result with a screen reader.

See the runnable [Live step counter example](/examples).

## Share one tour between components

When several components drive the same tour, for example a layout that renders it and pages that start it, create the tour once with `createGlowTour()` and pass it to `useGlowTour`:

```ts
// tour.ts
import { createGlowTour } from "@glowhop/vue-tour";

export const tour = createGlowTour();
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import { GlowTourDefault } from "@glowhop/vue-tour";
import HelpButton from "./HelpButton.vue";
import { tour } from "./tour";
</script>

<template>
  <HelpButton />
  <GlowTourDefault :tour="tour" />
</template>
```

```vue
<!-- HelpButton.vue -->
<script setup lang="ts">
import { useGlowTour } from "@glowhop/vue-tour";
import { tour } from "./tour";

const { status } = useGlowTour(tour);
</script>

<template>
  <button :disabled="status === 'active'">Help</button>
</template>
```

`useGlowTour(tour)` reads a tour it is given and never disposes it. Outside components, drive the same instance directly with `tour.start(workflow)`, `tour.cancel()`, and `tour.state`. In Nuxt, a plugin can provide the shared tour: see [With Nuxt](/docs/guides/ssr#with-nuxt).

## Vue 3.3+

GlowTour.js requires Vue 3.3 or later. The adapter uses provide/inject and refs for reactivity.

## SSR

`GlowTourDefault` supports server-side rendering in SSR mode. The component renders as an inert container on the server and hydrates without warnings on the client. With Nuxt, see [With Nuxt](/docs/guides/ssr#with-nuxt) in the SSR guide.
