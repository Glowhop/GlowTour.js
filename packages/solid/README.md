# @glowhop/solid-tour

ESM-only Solid adapter with native signals/accessors for reactive state. Content is Solid JSX. See the [Core guide](https://github.com/Glowhop/glow-tour/tree/main/packages/core) for workflow options and actions.

Compatibility: Solid 1.8+ (`^1.8.0`). SSR: the root renders through Solid's server build and browser work starts on mount; hydration is verified at package level and in a production SolidStart app. Full contract: [compatibility](https://github.com/Glowhop/glow-tour/blob/main/docs/compatibility.md).

<!-- glow-tour:snippet solid-quick-start -->
```tsx
import { render } from "solid-js/web";
import "@glowhop/styles-tour/default.css";
import { DefaultTour, createGlowTour } from "@glowhop/solid-tour";

const tour = createGlowTour();
const workflow = tour.create("intro").step({ id: "welcome", target: "#welcome", title: "Welcome", content: "Hello." }).build();
render(() => <><button id="welcome">Welcome</button><button type="button" onClick={() => void tour.run(workflow)}>Start tour</button><DefaultTour tour={tour} /></>, document.getElementById("app")!);
```

<!-- glow-tour:snippet solid-advanced -->
```tsx
import { GlowTour, createGlowTour } from "@glowhop/solid-tour";
const tour = createGlowTour(); const workflow = tour.create("custom").step({ id: "welcome", target: "#welcome", title: "Welcome", content: "Hello." }).build();
export function CustomTour() { return <><button id="welcome">Target</button><button type="button" onClick={() => void tour.run(workflow)}>Start</button><GlowTour.Root tour={tour}><GlowTour.Overlay /><GlowTour.Popover><GlowTour.Header /><GlowTour.Content /><GlowTour.Footer><GlowTour.AdvanceTrigger /></GlowTour.Footer></GlowTour.Popover></GlowTour.Root></>; }
```

`GlowTour.Root` and named primitives (`Overlay`, `Pointer`, `Popover`, `Header`, `Content`, `Footer`, and triggers) provide composition. `useTour()` exposes native Solid reactive state. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup follow Core.
