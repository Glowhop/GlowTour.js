# @glowhop/solid-tour

ESM-only Solid 1.9 adapter with native signals/accessors for reactive state. Content is Solid JSX. See the [Core guide](https://github.com/Glowhop/glow-tour/tree/main/packages/core) for workflow options and actions.

<!-- glow-tour:snippet solid-quick-start -->
```tsx
import { render } from "solid-js/web";
import "@glowhop/styles-tour/default.css";
import { DefaultTour, createGlowTour } from "@glowhop/solid-tour";

const tour = createGlowTour();
const workflow = tour.create("intro").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
render(() => <><button id="welcome">Welcome</button><button type="button" onClick={() => void tour.run(workflow)}>Start tour</button><DefaultTour tour={tour} /></>, document.getElementById("app")!);
```

<!-- glow-tour:snippet solid-advanced -->
```tsx
import { GlowTour, createGlowTour } from "@glowhop/solid-tour";
const tour = createGlowTour(); const workflow = tour.create("custom").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
export function CustomTour() { return <><button type="button" onClick={() => void tour.run(workflow)}>Start</button><GlowTour.Root tour={tour}><GlowTour.Overlay /><GlowTour.Popover><GlowTour.Header /><GlowTour.Content /><GlowTour.Footer><GlowTour.AdvanceTrigger /></GlowTour.Footer></GlowTour.Popover></GlowTour.Root></>; }
```

`GlowTour.Root` and named primitives (`Overlay`, `Pointer`, `Popover`, `Header`, `Content`, `Footer`, and triggers) provide composition. `useTour()` exposes native Solid reactive state. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup follow Core.
