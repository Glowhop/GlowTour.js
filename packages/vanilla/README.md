# @glowhop/vanilla-tour

ESM-only browser adapter using native custom elements. The pure entry point does not register elements:

```ts
import { createDefaultTourElement, createGlowTour, registerGlowTourElements } from "@glowhop/vanilla-tour";
registerGlowTourElements();
const tour = createGlowTour();
document.body.append(createDefaultTourElement(tour));
```

For automatic registration, import `@glowhop/vanilla-tour/auto`. Compose `glow-tour-root`, `glow-tour-overlay`, `glow-tour-pointer`, `glow-tour-popover`, and named header/content/footer/trigger elements. The host `disabled` attribute/property is consumer-owned; capability state is managed separately. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup are supported. See the [Core guide](https://github.com/Glowhop/glow-tour/tree/main/packages/core).

Advanced composition is ordinary DOM:

```ts
const root = document.createElement("glow-tour-root");
root.tour = tour;
root.append(document.createElement("glow-tour-overlay"), document.createElement("glow-tour-popover"));
document.body.append(root);
```
