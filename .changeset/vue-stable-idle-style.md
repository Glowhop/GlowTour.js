---
"@glowhop/vue-tour": patch
---

Keep the inline styles the core sets during a tour when Vue re-renders `GlowTourPopover`, `GlowTourPointer` or `GlowTourOverlay`. Each render used to write the idle style back: with `prefers-reduced-motion: reduce` the popover stayed invisible (`opacity: 0`), the fade-out on finish or cancel was skipped, and the overlay lost the `pointer-events` set by `allowInteraction` and its `100lvh` height.
