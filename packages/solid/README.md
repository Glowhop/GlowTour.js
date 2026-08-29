# @glowhop/solid-tour

ESM-only Solid 1.9 adapter with native signals/accessors for reactive state.

```tsx
import { DefaultTour, createGlowTour } from "@glowhop/solid-tour";
const tour = createGlowTour();
// Render <DefaultTour tour={tour} /> once.
await tour.run(tour.create("intro").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build());
```

Compose `GlowTour.Root`, `Overlay`, `Pointer`, `Popover`, `Header`, `Content`, `Footer`, and trigger primitives. `useTour()` exposes native reactive state. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup are supported. See the [Core guide](https://github.com/Glowhop/glow-tour/tree/main/packages/core).

Advanced composition:

```tsx
<GlowTour.Root tour={tour}><GlowTour.Overlay /><GlowTour.Popover><GlowTour.Header /><GlowTour.Content /><GlowTour.Footer><GlowTour.AdvanceTrigger /></GlowTour.Footer></GlowTour.Popover></GlowTour.Root>
```
