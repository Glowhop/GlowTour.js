<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: GlowTour is used in the template.
import { GlowTour, type Tour } from "@glowhop/vue-tour";

defineProps<{ tour: Tour }>();
</script>

<template>
  <GlowTour.Root :tour="tour">
    <GlowTour.Overlay />
    <GlowTour.Pointer />
    <GlowTour.Popover>
      <GlowTour.Header />
      <GlowTour.Content />
      <GlowTour.Footer>
        <GlowTour.PreviousTrigger />
        <GlowTour.AdvanceTrigger />
        <GlowTour.CancelTrigger />
      </GlowTour.Footer>
    </GlowTour.Popover>
  </GlowTour.Root>
</template>
