# @glowhop/vue-tour

ESM-only Vue 3.5 adapter with provide/inject refs for native reactive state. Content is Vue slot content. See the [Core guide](https://github.com/Glowhop/glow-tour/tree/main/packages/core) for workflow options and actions.

<!-- glow-tour:snippet vue-quick-start -->
```vue
<script setup lang="ts">
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, createGlowTour } from "@glowhop/vue-tour";
const tour = createGlowTour();
const workflow = tour.create("intro").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
function start() { void tour.run(workflow); }
</script>
<template><button id="welcome">Welcome</button><button type="button" @click="start">Start tour</button><GlowTourDefault :tour="tour" /></template>
```

<!-- glow-tour:snippet vue-advanced -->
```vue
<script setup lang="ts">
import { GlowTourRoot, GlowTourOverlay, GlowTourPopover, GlowTourHeader, GlowTourContent, GlowTourFooter, GlowTourAdvanceTrigger, createGlowTour } from "@glowhop/vue-tour";
const tour = createGlowTour(); const workflow = tour.create("custom").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build(); const start = () => void tour.run(workflow);
</script>
<template><button id="welcome" type="button" @click="start">Start</button><GlowTourRoot :tour="tour"><GlowTourOverlay /><GlowTourPopover><GlowTourHeader /><GlowTourContent /><GlowTourFooter><GlowTourAdvanceTrigger /></GlowTourFooter></GlowTourPopover></GlowTourRoot></template>
```

Use `GlowTourRoot`, `GlowTourOverlay`, `GlowTourPointer`, `GlowTourPopover`, `GlowTourHeader`, `GlowTourContent`, `GlowTourFooter`, and named triggers for composition. Vue refs and provide/inject are the native state surface. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup follow Core.
