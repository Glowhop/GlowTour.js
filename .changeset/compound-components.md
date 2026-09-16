---
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
---

Compose a tour with the `GlowTour` object.

**Added**

- React, Solid and Vue export a `GlowTour` object with the composition components without their prefix: `GlowTour.Root`, `GlowTour.Overlay`, `GlowTour.Pointer`, `GlowTour.Popover`, `GlowTour.Header`, `GlowTour.Content`, `GlowTour.Footer`, `GlowTour.AdvanceTrigger`, `GlowTour.PreviousTrigger` and `GlowTour.CancelTrigger`. It allows `<GlowTour.Root>` markup in JSX and in Vue `<script setup>` templates. `GlowTourDefault` is not part of it. The `GlowTour*` named exports are unchanged, and a bundle that does not use the object does not include it.
