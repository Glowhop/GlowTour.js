# @glowhop/vue-tour

ESM-only Vue 3.5 adapter with native refs and provide/inject reactive state.

```vue
<script setup lang="ts">
import { GlowTourDefault, createGlowTour } from "@glowhop/vue-tour";
const tour = createGlowTour();
</script>
<template><GlowTourDefault :tour="tour" /></template>
```

Use `GlowTourRoot`, `GlowTourOverlay`, `GlowTourPointer`, `GlowTourPopover`, `GlowTourHeader`, `GlowTourContent`, `GlowTourFooter`, and named trigger primitives. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup are supported. See the [Core guide](https://github.com/Glowhop/glow-tour/tree/main/packages/core).

Advanced composition uses named primitives:

```vue
<GlowTourRoot :tour="tour"><GlowTourOverlay /><GlowTourPopover><GlowTourHeader /><GlowTourContent /><GlowTourFooter><GlowTourAdvanceTrigger /></GlowTourFooter></GlowTourPopover></GlowTourRoot>
```
