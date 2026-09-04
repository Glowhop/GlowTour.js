---
title: Vue guide
description: Build guided tours with @glowhop/vue-tour.
---

Glow Tour's Vue adapter provides components and a provide/inject instance scoped through the component tree. Content is normal Vue slot content.

## Setup

Install the package and import the default theme:

```bash
bun add @glowhop/vue-tour @glowhop/styles-tour
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

## Custom composition

Use `useTour()` hook and named components to build a custom tour layout:

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
  GlowTourCancelTrigger,
  createGlowTour,
  useTour,
} from "@glowhop/vue-tour";

const tour = createGlowTour();
const tourState = useTour(tour);
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
        <GlowTourAdvanceTrigger />
      </GlowTourFooter>
    </GlowTourPopover>
  </GlowTourRoot>
</template>
```

The `useTour()` hook returns a ref to the reactive tour state.

## Vue 3.3+

Glow Tour requires Vue 3.3 or later. The adapter uses provide/inject and refs for reactivity.

## SSR

`GlowTourDefault` supports server-side rendering in SSR mode. The component renders as an inert container on the server and hydrates without warnings on the client. See the SSR guide for details.
