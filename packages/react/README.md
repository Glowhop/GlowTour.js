# @glowhop/react-tour

ESM-only React 19 adapter with `useSyncExternalStore`-backed state. Content is React content. See the [Core guide](https://github.com/Glowhop/glow-tour/tree/main/packages/core) for workflow options and actions.

<!-- glow-tour:snippet react -->
```tsx
import { createRoot } from "react-dom/client";
import "@glowhop/styles-tour/default.css";
import { DefaultTour, createGlowTour } from "@glowhop/react-tour";

const tour = createGlowTour();
const workflow = tour.create("intro").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
createRoot(document.getElementById("app")!).render(<><button id="welcome">Welcome</button><DefaultTour tour={tour} /></>);
void tour.run(workflow);
```

Compose `GlowTour.Root`, `Overlay`, `Pointer`, `Popover`, `Header`, `Content`, `Footer`, and trigger primitives. `DefaultTour` is the complete default composition; `useTour()` exposes native reactive state. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup follow Core.
