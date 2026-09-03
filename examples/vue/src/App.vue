<script setup lang="ts">
import "@glowhop/styles-tour/default.css";
// biome-ignore lint/correctness/noUnusedImports: used in template
import { createGlowTour, GlowTourDefault } from "@glowhop/vue-tour";

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({ target: "#welcome", title: "Welcome", content: "Hello world!" })
  .build();

// biome-ignore lint/correctness/noUnusedVariables: used in template
function start() {
  void tour.run(workflow);
}
</script>

<template>
  <div style="padding: 20px">
    <h1>Glow Tour - Vue Example</h1>
    <button id="welcome" type="button" @click="start"
      style="padding: 10px 20px; font-size: 16px">
      Start tour
    </button>
  </div>
  <GlowTourDefault :tour="tour" />
</template>
