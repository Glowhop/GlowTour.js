# @glowhop/react-tour

ESM-only React 18/19 adapter with `useSyncExternalStore`-backed state. Content is React content. See the [Core guide](https://github.com/Glowhop/GlowTour.js/tree/main/packages/core) for workflow options and actions.

Compatibility: React 18 and 19 (`^18.0.0 || ^19.0.0`). SSR: `GlowTourDefault` renders through `react-dom/server` and package imports are DOM-free; hydration is verified at package level and in a production Next.js app. Full contract: [compatibility](https://github.com/Glowhop/GlowTour.js/blob/main/docs/compatibility.md).

<!-- glow-tour:snippet react-quick-start -->
```tsx
import { createRoot } from "react-dom/client";
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, createGlowTour } from "@glowhop/react-tour";

const tour = createGlowTour();
const workflow = tour.create("intro").step({ id: "welcome", target: "#welcome", title: "Welcome", content: "Hello." }).build();
createRoot(document.getElementById("app")!).render(<><button id="welcome">Welcome</button><button type="button" onClick={() => void tour.start(workflow)}>Start tour</button><GlowTourDefault tour={tour} /></>);
```

<!-- glow-tour:snippet react-advanced -->
```tsx
import { createGlowTour, GlowTourAdvanceTrigger, GlowTourCancelTrigger, GlowTourContent, GlowTourFooter, GlowTourHeader, GlowTourOverlay, GlowTourPointer, GlowTourPopover, GlowTourRoot } from "@glowhop/react-tour";
const tour = createGlowTour(); const workflow = tour.create("custom").step({ id: "welcome", target: "#welcome", title: "Welcome", content: "Hello." }).build();
export function CustomTour() { return <><button id="welcome">Target</button><button type="button" onClick={() => void tour.start(workflow)}>Start</button><GlowTourRoot tour={tour}><GlowTourOverlay /><GlowTourPointer /><GlowTourPopover><GlowTourHeader /><GlowTourContent /><GlowTourFooter><GlowTourCancelTrigger /><GlowTourAdvanceTrigger /></GlowTourFooter></GlowTourPopover></GlowTourRoot></>; }
```

Compose `GlowTourRoot`, `GlowTourOverlay`, `GlowTourPointer`, `GlowTourPopover`, `GlowTourHeader`, `GlowTourContent`, `GlowTourFooter`, and trigger primitives. `GlowTourDefault` is the complete default composition. `useGlowTour()` runs a tour from a component and returns its state; `useGlowTourContext()` reads that state inside `GlowTourRoot`. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup follow Core.
