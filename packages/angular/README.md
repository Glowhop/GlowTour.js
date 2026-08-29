# @glowhop/angular-tour

ESM-only Angular 18.2 adapter with DI-scoped signals for native reactive state. Content is Angular template content. See the [Core guide](https://github.com/Glowhop/glow-tour/tree/main/packages/core) for workflow options and actions.

<!-- glow-tour:snippet angular -->
```ts
import { Component } from "@angular/core";
import "@glowhop/styles-tour/default.css";
import { createGlowTour, GlowTourDefault } from "@glowhop/angular-tour";

@Component({
  standalone: true,
  imports: [GlowTourDefault],
  template: '<button id="welcome">Welcome</button><glow-tour-default [tour]="tour" />',
})
export class Onboarding {
  readonly tour = createGlowTour();
  readonly workflow = this.tour.create("intro").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
  start() { void this.tour.run(this.workflow); }
}
```

Use `GlowTourRoot`, `GlowTourOverlay`, `GlowTourPointer`, `GlowTourPopover`, `GlowTourHeader`, `GlowTourContent`, `GlowTourFooter`, and named triggers for composition. Angular signals and DI provide the native state surface. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup follow Core.
