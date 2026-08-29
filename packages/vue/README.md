# @glowhop/vue-tour

ESM-only Vue 3.5 adapter with provide/inject refs for native reactive state. Content is Vue slot content. See the [Core guide](https://github.com/Glowhop/glow-tour/tree/main/packages/core) for workflow options and actions.

<!-- glow-tour:snippet vue -->
```vue
<script setup lang="ts">
import { onMounted } from "vue";
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, createGlowTour } from "@glowhop/vue-tour";
const tour = createGlowTour();
const workflow = tour.create("intro").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
onMounted(() => void tour.run(workflow));
</script>
<template><button id="welcome">Welcome</button><GlowTourDefault :tour="tour" /></template>
```

Use `GlowTourRoot`, `GlowTourOverlay`, `GlowTourPointer`, `GlowTourPopover`, `GlowTourHeader`, `GlowTourContent`, `GlowTourFooter`, and named triggers for composition. Vue refs and provide/inject are the native state surface. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup follow Core.
