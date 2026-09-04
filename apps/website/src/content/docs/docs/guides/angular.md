---
title: Angular guide
description: Build guided tours with @glowhop/angular-tour.
---

Glow Tour's Angular adapter provides components and a DI-scoped tour instance. Content is normal Angular template content with full support for bindings and directives.

## Setup

Install the package and import the default theme:

```bash
bun add @glowhop/angular-tour @glowhop/styles-tour
```

```typescript
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, createGlowTour } from "@glowhop/angular-tour";
```

## Instance scoping

Create the tour instance in a component or service, then inject it into other components via Angular's Dependency Injection:

```typescript
import { Injectable } from "@angular/core";
import { createGlowTour } from "@glowhop/angular-tour";

@Injectable({ providedIn: "root" })
export class TourService {
  readonly tour = createGlowTour();
}
```

Then inject it into your components:

```typescript
import { Component } from "@angular/core";
import { GlowTourDefault } from "@glowhop/angular-tour";
import { TourService } from "./tour.service";

@Component({
  standalone: true,
  imports: [GlowTourDefault],
  template: `
    <div>
      <!-- Your app content -->
      <glow-tour-default [tour]="tour" />
    </div>
  `,
})
export class AppComponent {
  tour = this.tourService.tour;

  constructor(private tourService: TourService) {}
}
```

## Complete example

```typescript
import { Component } from "@angular/core";
import "@glowhop/styles-tour/default.css";
import { createGlowTour, GlowTourDefault } from "@glowhop/angular-tour";

@Component({
  standalone: true,
  imports: [GlowTourDefault],
  template: `
    <header>
      <h1>Welcome</h1>
    </header>
    <main>
      <section id="features">
        <h2>Features</h2>
        <p>We offer guided tours, SSR support, and full keyboard navigation.</p>
      </section>
      <section id="pricing">
        <h2>Pricing</h2>
        <p>Open source and free.</p>
      </section>
      <button (click)="startTour()">Start tour</button>
    </main>
    <glow-tour-default [tour]="tour" />
  `,
})
export class TourComponent {
  readonly tour = createGlowTour();

  readonly workflow = this.tour
    .create("product-tour")
    .step({
      target: "#features",
      title: "Explore features",
      content: "Learn about all the capabilities.",
    })
    .step({
      target: "#pricing",
      title: "Check pricing",
      content: "See plans that fit your needs.",
    })
    .build();

  startTour() {
    void this.tour.run(this.workflow);
  }
}
```

## Custom composition

Use named components to build a custom tour layout:

```typescript
import { Component } from "@angular/core";
import {
  GlowTourRoot,
  GlowTourOverlay,
  GlowTourPointer,
  GlowTourPopover,
  GlowTourHeader,
  GlowTourContent,
  GlowTourFooter,
  GlowTourAdvanceTrigger,
  GlowTourCancelTrigger,
  createGlowTour,
} from "@glowhop/angular-tour";

@Component({
  standalone: true,
  imports: [
    GlowTourRoot,
    GlowTourOverlay,
    GlowTourPointer,
    GlowTourPopover,
    GlowTourHeader,
    GlowTourContent,
    GlowTourFooter,
    GlowTourAdvanceTrigger,
    GlowTourCancelTrigger,
  ],
  template: `
    <glow-tour-root [tour]="tour">
      <glow-tour-overlay />
      <glow-tour-pointer />
      <glow-tour-popover>
        <glow-tour-header />
        <glow-tour-content />
        <glow-tour-footer>
          <glow-tour-cancel-trigger />
          <glow-tour-advance-trigger />
        </glow-tour-footer>
      </glow-tour-popover>
    </glow-tour-root>
  `,
})
export class CustomTour {
  readonly tour = createGlowTour();
}
```

## Reactive state with `injectGlowTour`

Use `injectGlowTour()` to access the tour state as a Signal within any component inside a `glow-tour-root`:

```typescript
import { Component, inject } from "@angular/core";
import {
  GlowTourRoot,
  GlowTourOverlay,
  GlowTourPopover,
  injectGlowTour,
  createGlowTour,
} from "@glowhop/angular-tour";

@Component({
  standalone: true,
  imports: [GlowTourRoot, GlowTourOverlay, GlowTourPopover],
  template: `
    <glow-tour-root [tour]="tour">
      <glow-tour-overlay />
      <glow-tour-popover>
        @if (state(); as tourState) {
          <p>Current step: {{ tourState.currentStep?.index }}</p>
          <button [disabled]="!tourState.canAdvance" (click)="tour.advance()">
            Next
          </button>
        }
      </glow-tour-popover>
    </glow-tour-root>
  `,
})
export class CustomTourWithState {
  readonly tour = createGlowTour();
  protected readonly state = injectGlowTour();
}
```

Angular signals are used for reactive state management internally; no additional setup is needed for reactivity.

## Angular 18+

Glow Tour requires Angular 18 or later. The adapter uses Angular's new control-flow blocks (`@if`, `@for`) and standalone components exclusively.

## SSR

The adapter packages are DOM-free for import. Server-side rendering is not actively verified. See the compatibility table for details.
