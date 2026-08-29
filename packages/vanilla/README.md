# @glowhop/vanilla-tour

ESM-only browser adapter using native custom elements. The pure entry point does not register elements; registration is explicit. The `/auto` entry point registers them as a side effect. See the [Core guide](https://github.com/Glowhop/glow-tour/tree/main/packages/core) for workflow options and actions.

<!-- glow-tour:snippet vanilla -->
```ts
import "@glowhop/styles-tour/default.css";
import { createDefaultTourElement, createGlowTour, registerGlowTourElements } from "@glowhop/vanilla-tour";

registerGlowTourElements();
const tour = createGlowTour();
const workflow = tour.create("intro").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
document.body.innerHTML = '<button id="welcome">Welcome</button>';
document.body.append(createDefaultTourElement(tour));
void tour.run(workflow);
```

Alternatively import `@glowhop/vanilla-tour/auto`. Compose `glow-tour-root`, `glow-tour-overlay`, `glow-tour-pointer`, `glow-tour-popover`, and named header/content/footer/trigger elements. The host `disabled` attribute/property is consumer-owned; capability state is separate. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup follow Core.
