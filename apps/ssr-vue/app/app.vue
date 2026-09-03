<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template
import { createGlowTour, GlowTourDefault } from "@glowhop/vue-tour";

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({
    content: "This step is rendered by the SSR verification harness.",
    target: "#tour-target",
    title: "Step one",
  })
  .step({
    content: "Clicking advance again finishes the tour.",
    target: "#tour-trigger",
    title: "Step two",
  })
  .build();

// biome-ignore lint/correctness/noUnusedVariables: used in template
function start() {
  void tour.run(workflow);
}
</script>

<template>
  <div style="padding: 20px">
    <h1>Glow Tour - SSR Vue (Nuxt) verification harness</h1>
    <p id="tour-target">This is the tour target element.</p>
    <button id="tour-trigger" type="button" @click="start">Start tour</button>
  </div>
  <GlowTourDefault :tour="tour" />
</template>
