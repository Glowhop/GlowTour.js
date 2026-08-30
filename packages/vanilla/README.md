# @glowhop/vanilla-tour

ESM-only browser adapter using native custom elements. The pure entry point does not register elements; registration is explicit. The `/auto` entry point registers them as a side effect. See the [Core guide](https://github.com/Glowhop/glow-tour/tree/main/packages/core) for workflow options and actions.

Compatibility: modern browser DOM and custom-element APIs. SSR: imports are DOM-free; custom-element mounting is browser-only and hydration is unverified.

<!-- glow-tour:snippet vanilla-quick-start -->
```ts
import "@glowhop/styles-tour/default.css";
import { createDefaultTourElement, createGlowTour, registerGlowTourElements } from "@glowhop/vanilla-tour";

registerGlowTourElements();
const tour = createGlowTour();
const workflow = tour.create("intro").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
document.body.innerHTML = '<button id="welcome">Welcome</button>';
const root = createDefaultTourElement(tour); document.body.append(root);
const startButton = document.createElement("button"); startButton.type = "button"; startButton.textContent = "Start tour"; document.body.append(startButton);
startButton.addEventListener("click", () => void tour.run(workflow));
```

<!-- glow-tour:snippet vanilla-advanced -->
```ts
import { createGlowTour, registerGlowTourElements } from "@glowhop/vanilla-tour";
registerGlowTourElements(); const tour = createGlowTour(); const target = document.createElement("button"); target.id = "welcome"; target.textContent = "Target"; document.body.append(target); const root = document.createElement("glow-tour-root"); root.tour = tour; root.append(document.createElement("glow-tour-overlay"), document.createElement("glow-tour-popover")); document.body.append(root);
const start = document.createElement("button"); start.type = "button"; start.textContent = "Start"; start.addEventListener("click", () => void tour.run(tour.create("custom").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build())); document.body.append(start);
```

Alternatively import `@glowhop/vanilla-tour/auto`. Compose `glow-tour-root`, `glow-tour-overlay`, `glow-tour-pointer`, `glow-tour-popover`, and named header/content/footer/trigger elements. The host `disabled` attribute/property is consumer-owned; capability state is separate. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup follow Core.
