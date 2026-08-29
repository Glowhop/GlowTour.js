# @glowhop/react-tour

ESM-only React 19 adapter with native `useSyncExternalStore` state.

```tsx
import { DefaultTour, createGlowTour } from "@glowhop/react-tour";
const tour = createGlowTour();
// Render <DefaultTour tour={tour} /> once.
await tour.run(tour.create("intro").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build());
```

Compose `GlowTour.Root`, `Overlay`, `Pointer`, `Popover`, `Header`, `Content`, `Footer`, and trigger primitives. `useTour()` reads native reactive state. Steps support static or dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup. See the [Core guide](https://github.com/Glowhop/glow-tour/tree/main/packages/core).

Advanced composition keeps the same tour instance:

```tsx
<GlowTour.Root tour={tour}><GlowTour.Overlay /><GlowTour.Popover><GlowTour.Header /><GlowTour.Content /><GlowTour.Footer><GlowTour.AdvanceTrigger /></GlowTour.Footer></GlowTour.Popover></GlowTour.Root>
```
