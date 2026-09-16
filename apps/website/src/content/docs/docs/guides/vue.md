---
title: Vue guide
description: Build guided tours with @glowhop/vue-tour.
---

The GlowTour.js Vue adapter provides components and a provide/inject instance scoped through the component tree. Content is normal Vue slot content.

## Setup

Install the package and import the default theme:

```bash
npm i @glowhop/vue-tour @glowhop/styles-tour
```

```vue
<script setup>
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, createGlowTour } from "@glowhop/vue-tour";
</script>
```

## Instance scoping

Create the tour instance and inject it into the component tree using Vue's provide/inject:

```vue
<script setup>
import { createGlowTour } from "@glowhop/vue-tour";

const tour = createGlowTour();
</script>

<template>
  <div>
    <!-- Your app content -->
    <GlowTourDefault :tour="tour" />
  </div>
</template>
```

## Complete example

```vue
<script setup lang="ts">
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, createGlowTour } from "@glowhop/vue-tour";

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

function startTour() {
  void tour.run(workflow);
}
</script>

<template>
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
    <button @click="startTour">Start tour</button>
  </main>
  <GlowTourDefault :tour="tour" />
</template>
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

Components rendered inside `GlowTourRoot` can read its reactive state with `useTour()`. Create the counter as a child component so the root context is available:

```vue
<!-- StepCounter.vue -->
<script setup lang="ts">
import { useTour } from "@glowhop/vue-tour";

const state = useTour();
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

### Subscribe outside the composition

`useTour()` is intended for descendants of `GlowTourRoot`. Elsewhere in a Vue application, adapt the store to a ref and dispose the listener with the current effect scope:

```vue
<script setup lang="ts">
import { onScopeDispose, shallowRef } from "vue";

const state = shallowRef(tour.state.get());
const unsubscribe = tour.state.subscribe((nextState) => {
  state.value = nextState;
});
onScopeDispose(unsubscribe);
</script>

<template>
  <p>Tour status: {{ state.status }}</p>
</template>
```

`tour.state.get()` returns the current snapshot. `tour.state.subscribe(listener)` returns the cleanup function passed to `onScopeDispose`. See [Programmatic control](/docs/guides/programmatic-control) for the complete state contract.

## Vue 3.3+

GlowTour.js requires Vue 3.3 or later. The adapter uses provide/inject and refs for reactivity.

## SSR

`GlowTourDefault` supports server-side rendering in SSR mode. The component renders as an inert container on the server and hydrates without warnings on the client. See the SSR guide for details.
