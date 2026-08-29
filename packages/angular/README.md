# @glowhop/angular-tour

ESM-only Angular 18.2 adapter with DI-scoped signals for native reactive state. Content is Angular template content. See the [Core guide](https://github.com/Glowhop/glow-tour/tree/main/packages/core) for workflow options and actions.

<!-- glow-tour:snippet angular-quick-start -->
```ts
import { Component } from "@angular/core";
import "@glowhop/styles-tour/default.css";
import { createGlowTour, GlowTourDefault } from "@glowhop/angular-tour";

@Component({
  standalone: true,
  imports: [GlowTourDefault],
  template: '<button id="welcome">Welcome</button><button type="button" (click)="start()">Start tour</button><glow-tour-default [tour]="tour" />',
})
export class Onboarding {
  readonly tour = createGlowTour();
  readonly workflow = this.tour.create("intro").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
  start() { void this.tour.run(this.workflow); }
}
```

<!-- glow-tour:snippet angular-advanced -->
```ts
import { Component } from "@angular/core";
import { GlowTourRoot, GlowTourOverlay, GlowTourPopover, GlowTourHeader, GlowTourContent, GlowTourFooter, GlowTourAdvanceTrigger, createGlowTour } from "@glowhop/angular-tour";
@Component({ standalone: true, imports: [GlowTourRoot, GlowTourOverlay, GlowTourPopover, GlowTourHeader, GlowTourContent, GlowTourFooter, GlowTourAdvanceTrigger], template: '<button id="welcome" type="button" (click)="start()">Start</button><glow-tour-root [tour]="tour"><glow-tour-overlay /><glow-tour-popover><glow-tour-header /><glow-tour-content /><glow-tour-footer><glow-tour-advance-trigger /></glow-tour-footer></glow-tour-popover></glow-tour-root>' })
export class CustomTour { readonly tour = createGlowTour(); readonly workflow = this.tour.create("custom").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build(); start() { void this.tour.run(this.workflow); } }
```

Use `GlowTourRoot`, `GlowTourOverlay`, `GlowTourPointer`, `GlowTourPopover`, `GlowTourHeader`, `GlowTourContent`, `GlowTourFooter`, and named triggers for composition. Angular signals and DI provide the native state surface. Static/dynamic targets, placement, interaction, scroll, callbacks, actions/events, cancellation, and cleanup follow Core.
