---
title: Angular guide
description: Build guided tours with @glowhop/angular-tour.
---

The GlowTour.js Angular adapter provides components and a DI-scoped tour instance. Content is normal Angular template content with full support for bindings and directives.

## Setup

Install the package and import the default theme:

```bash
npm i @glowhop/angular-tour @glowhop/styles-tour
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
      id: "features",
      target: "#features",
      title: "Explore features",
      content: "Learn about all the capabilities.",
    })
    .step({
      id: "pricing",
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

## Customize progressively

`GlowTourDefault` is the shortest path to a complete tour. Keep it while you only need visual changes, then move to composition when you need to change the popover structure.

### Style `GlowTourDefault` with CSS

The default component reads the theme's CSS custom properties, so colors, spacing, and shape can change without replacing any components:

```css
:where([data-glow-tour-root]) {
  --glow-tour-color-accent: #7c3aed;
  --glow-tour-color-surface: #faf5ff;
  --glow-tour-radius: 16px;
}
```

Keep rendering `<glow-tour-default [tour]="tour" />`. See the [theming guide](/docs/guides/theming) for all available tokens.

### Compose the default layout

When you need to add, remove, or rearrange content, expand `GlowTourDefault` into the components it assembles for you:

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
  GlowTourBackTrigger,
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
    GlowTourBackTrigger,
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
          <glow-tour-back-trigger />
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

### Add a custom step counter

Components rendered inside `GlowTourRoot` can read its reactive state with `injectGlowTour()`. Create the counter as a child component so the root's injector is available:

```typescript
import { Component } from "@angular/core";
import { injectGlowTour } from "@glowhop/angular-tour";

@Component({
  selector: "app-step-counter",
  standalone: true,
  template: `
    @if (state(); as tourState) {
      @if (tourState.currentStepIndex >= 0 && tourState.totalSteps > 0) {
        <p>Step {{ tourState.currentStepIndex + 1 }} of {{ tourState.totalSteps }}</p>
      }
    }
  `,
})
export class StepCounter {
  protected readonly state = injectGlowTour();
}
```

Add `StepCounter` to the `imports` array of `CustomTour`, then place it inside the composed popover:

```html
<glow-tour-popover>
  <glow-tour-header />
  <app-step-counter />
  <glow-tour-content />
  <!-- Keep the same footer as above. -->
</glow-tour-popover>
```

To have assistive technologies announce the complete counter when it changes, you can add `aria-live="polite"` and `aria-atomic="true"` to the `<p>`. `GlowTourContent` is already a polite live region, so enable a second one only when the counter conveys useful distinct information, and test the result with a screen reader.

See the runnable [Live step counter example](/examples).

### Subscribe outside the composition

`injectGlowTour()` is intended for descendants of `GlowTourRoot`. Elsewhere in an Angular application, adapt the store to a signal and unsubscribe when the component is destroyed:

```typescript
import { Component, DestroyRef, inject, signal } from "@angular/core";
import { TourService } from "./tour.service";

@Component({
  selector: "app-tour-status",
  standalone: true,
  template: `<p>Tour status: {{ state().status }}</p>`,
})
export class TourStatus {
  private readonly tourService = inject(TourService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly state = signal(this.tourService.tour.state.get());

  constructor() {
    const unsubscribe = this.tourService.tour.state.subscribe((nextState) => {
      this.state.set(nextState);
    });
    this.destroyRef.onDestroy(unsubscribe);
  }
}
```

`tour.state.get()` returns the current snapshot. `tour.state.subscribe(listener)` returns the cleanup function registered with `DestroyRef`. See [Programmatic control](/docs/guides/programmatic-control) for the complete state contract.

## Angular 18+

GlowTour.js requires Angular 18 or later. The adapter uses Angular's new control-flow blocks (`@if`, `@for`) and standalone components exclusively.

## SSR

The adapter packages are DOM-free for import. Server-side rendering is not actively verified. See the compatibility table for details.
