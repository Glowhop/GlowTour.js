<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: GlowTour is used in the template.
import { GlowTourDefault, type Tour } from "@glowhop/vue-tour";

defineProps<{ tour: Tour }>();
</script>

<template>
  <GlowTourDefault :tour="tour" />
    
</template>
