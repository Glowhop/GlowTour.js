<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template
import { GlowTourDefault } from "@glowhop/vue-tour";

const { $glowTour } = useNuxtApp();
// biome-ignore lint/correctness/noUnusedVariables: status is used in template
const { create, start, status } = useGlowTour($glowTour);

const workflow = create("welcome")
  .step({
    id: "tour-target",
    content: "This step is rendered by the SSR verification harness.",
    target: '[data-tour="target"]',
    title: "Step one",
  })
  .step({
    id: "tour-trigger",
    content: "Clicking advance again finishes the tour.",
    target: "#tour-trigger",
    title: "Step two",
  })
  .build();

// biome-ignore lint/correctness/noUnusedVariables: used in template
function startTour() {
  void start(workflow);
}
</script>

<template>
  <div style="padding: 20px">
    <h1>GlowTour.js - SSR Vue (Nuxt) verification harness</h1>
    <p id="tour-target" data-tour="target">This is the tour target element.</p>
    <p id="tour-status">{{ status }}</p>
    <button id="tour-trigger" type="button" @click="startTour">Start tour</button>
  </div>
  <GlowTourDefault :tour="$glowTour" />
</template>
