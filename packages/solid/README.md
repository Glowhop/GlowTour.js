# @glowhop/solid-tour

ESM-only Solid adapter with native signals/accessors for reactive state. Content is Solid JSX. See the [Core guide](https://github.com/Glowhop/GlowTour.js/tree/main/packages/core) for workflow options and actions.

Compatibility: Solid 1.8+ (`^1.8.0`). SSR: the root renders through Solid's server build and browser work starts on mount; hydration is verified at package level and in a production SolidStart app. Full contract: [compatibility](https://github.com/Glowhop/GlowTour.js/blob/main/docs/compatibility.md).

<!-- glow-tour:snippet solid-quick-start -->
```tsx
import { render } from "solid-js/web";
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, createGlowTour } from "@glowhop/solid-tour";

const tour = createGlowTour();
const workflow = tour.create("intro").step({ id: "welcome", target: "#welcome", title: "Welcome", content: "Hello." }).build();
render(() => <><button id="welcome">Welcome</button><button type="button" onClick={() => void tour.start(workflow)}>Start tour</button><GlowTourDefault tour={tour} /></>, document.getElementById("app")!);
```

<!-- glow-tour:snippet solid-advanced -->
```tsx
import { createGlowTour, GlowTourAdvanceTrigger, GlowTourContent, GlowTourFooter, GlowTourHeader, GlowTourOverlay, GlowTourPopover, GlowTourRoot } from "@glowhop/solid-tour";
const tour = createGlowTour(); const workflow = tour.create("custom").step({ id: "welcome", target: "#welcome", title: "Welcome", content: "Hello." }).build();
export function CustomTour() { return <><button id="welcome">Target</button><button type="button" onClick={() => void tour.start(workflow)}>Start</button><GlowTourRoot tour={tour}><GlowTourOverlay /><GlowTourPopover><GlowTourHeader /><GlowTourContent /><GlowTourFooter><GlowTourAdvanceTrigger /></GlowTourFooter></GlowTourPopover></GlowTourRoot></>; }
```

`GlowTourRoot` and named primitives (`GlowTourOverlay`, `GlowTourPointer`, `GlowTourPopover`, `GlowTourHeader`, `GlowTourContent`, `GlowTourFooter`, and triggers) provide composition. `useGlowTour()` runs a tour from a component and returns its state as accessors; `useTourContext()` reads that state inside `GlowTourRoot`. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup follow Core.
