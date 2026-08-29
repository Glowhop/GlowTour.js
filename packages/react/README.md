# @glowhop/react-tour

ESM-only React 19 adapter with `useSyncExternalStore`-backed state. Content is React content. See the [Core guide](https://github.com/Glowhop/glow-tour/tree/main/packages/core) for workflow options and actions.

<!-- glow-tour:snippet react-quick-start -->
```tsx
import { createRoot } from "react-dom/client";
import "@glowhop/styles-tour/default.css";
import { DefaultTour, createGlowTour } from "@glowhop/react-tour";

const tour = createGlowTour();
const workflow = tour.create("intro").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
createRoot(document.getElementById("app")!).render(<><button id="welcome">Welcome</button><button type="button" onClick={() => void tour.run(workflow)}>Start tour</button><DefaultTour tour={tour} /></>);
```

<!-- glow-tour:snippet react-advanced -->
```tsx
import { GlowTour, createGlowTour } from "@glowhop/react-tour";
const tour = createGlowTour(); const workflow = tour.create("custom").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
export function CustomTour() { return <><button type="button" onClick={() => void tour.run(workflow)}>Start</button><GlowTour.Root tour={tour}><GlowTour.Overlay /><GlowTour.Pointer /><GlowTour.Popover><GlowTour.Header /><GlowTour.Content /><GlowTour.Footer><GlowTour.CancelTrigger /><GlowTour.AdvanceTrigger /></GlowTour.Footer></GlowTour.Popover></GlowTour.Root></>; }
```

Compose `GlowTour.Root`, `Overlay`, `Pointer`, `Popover`, `Header`, `Content`, `Footer`, and trigger primitives. `DefaultTour` is the complete default composition; `useTour()` exposes native reactive state. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup follow Core.
