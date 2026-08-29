# @glowhop/angular-tour

ESM-only Angular 18.2 adapter with native signals and DI-scoped reactive state.

```ts
import { GlowTourDefault, createGlowTour } from "@glowhop/angular-tour";

export class Onboarding {
  readonly tour = createGlowTour();
  // Add GlowTourDefault to this standalone component's imports and bind [tour].
}
```

Compose `GlowTourRoot`, `GlowTourOverlay`, `GlowTourPointer`, `GlowTourPopover`, `GlowTourHeader`, `GlowTourContent`, `GlowTourFooter`, and named trigger primitives. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup are supported. See the [Core guide](https://github.com/Glowhop/glow-tour/tree/main/packages/core).

Advanced composition:

```html
<glow-tour-root [tour]="tour"><glow-tour-overlay /><glow-tour-popover><glow-tour-header /><glow-tour-content /><glow-tour-footer><glow-tour-advance-trigger /></glow-tour-footer></glow-tour-popover></glow-tour-root>
```
