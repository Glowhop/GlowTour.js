---
title: Angular guide
description: Build guided tours with @glowhop/angular-tour.
---

The GlowTour.js Angular adapter provides components and a DI-scoped tour instance. Content is normal Angular template content with full support for bindings and directives.

## Setup

Install the adapter and the default theme. The theme is imported once, as shown in the example below.

```bash
npm i @glowhop/angular-tour @glowhop/styles-tour
```

## Run a tour from a component

`injectGlowTour()` creates a tour for the component and returns everything needed to drive it: the `tour` to render, its methods (`create`, `start`, `advance`, `previous`, `goTo`, `cancel`), and one signal per state field. Call it in an injection context, such as a field initializer.

```typescript
import { Component } from "@angular/core";
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, injectGlowTour } from "@glowhop/angular-tour";

@Component({
  standalone: true,
  imports: [GlowTourDefault],
  template: `
    <main>
      <section data-tour="features">
        <h2>Features</h2>
        <p>We offer guided tours, SSR support, and full keyboard navigation.</p>
      </section>
      <section data-tour="pricing">
        <h2>Pricing</h2>
        <p>Open source and free.</p>
      </section>
      @if (glow.status() === "active") {
        <p>
          Step {{ glow.currentStepIndex() + 1 }} of {{ glow.totalSteps() }}
          <button (click)="glow.cancel()">Stop</button>
        </p>
      } @else {
        <button (click)="startTour()">Start tour</button>
      }
    </main>
    <glow-tour-default [tour]="glow.tour" />
  `,
})
export class TourComponent {
  readonly glow = injectGlowTour();

  private readonly workflow = this.glow
    .create("product-tour")
    .step({
      id: "features",
      target: '[data-tour="features"]',
      title: "Explore features",
      content: "Learn about all the capabilities.",
    })
    .step({
      id: "pricing",
      target: '[data-tour="pricing"]',
      title: "Check pricing",
      content: "See plans that fit your needs.",
    })
    .build();

  startTour() {
    void this.glow.start(this.workflow);
  }
}
```

The tour is disposed when the component's injector is destroyed.

To drive the same tour from several components, see [Share one tour between components](#share-one-tour-between-components).

## Step targets

A step's `target` is the element the tour highlights. It accepts three forms:

| Form | Example | Use it for |
|---|---|---|
| CSS selector | `'[data-tour="pricing"]'`, `"#pricing"` | Markup you render yourself |
| Function | `() => element` | A `viewChild` query, or an element that appears later |
| `HTMLElement` | `document.body` | An element that already exists when the workflow is built |

Selectors and functions are resolved each time the step is entered, not when the workflow is built.

### Mark elements with `data-tour`

Ids break as soon as a component renders twice, and classes change with styling. A dedicated attribute states the intent and survives both:

```html
<section data-tour="pricing">
  <h2>Pricing</h2>
</section>
```

```ts
.step({ id: "pricing", target: '[data-tour="pricing"]', title: "Pricing", content: "Pick a plan." })
```

A selector matches the first element in the document, wherever it is rendered, so it keeps working with CDK overlays. When a component renders several times, target the one you mean through a ref.

### Target a `viewChild` query through a function

Wrap the ref in a function. The function runs when the step is entered, after the component has mounted, so it reads the rendered element:

```typescript
import { Component, type ElementRef, viewChild } from "@angular/core";
import { GlowTourDefault, injectGlowTour } from "@glowhop/angular-tour";

@Component({
  selector: "app-checkout",
  standalone: true,
  imports: [GlowTourDefault],
  template: `
    <button #payButton>Pay</button>
    <button (click)="startTour()">Show me</button>
    <glow-tour-default [tour]="glow.tour" />
  `,
})
export class Checkout {
  readonly glow = injectGlowTour();
  private readonly payButton = viewChild<ElementRef<HTMLButtonElement>>("payButton");

  private readonly workflow = this.glow
    .create("checkout")
    .step({
      id: "pay",
      target: () => this.payButton()?.nativeElement ?? null,
      title: "Pay",
      content: "Confirm your order here.",
    })
    .build();

  startTour() {
    void this.glow.start(this.workflow);
  }
}
```

With a decorator query, `@ViewChild("payButton") payButton?: ElementRef<HTMLButtonElement>`, the target is `() => this.payButton?.nativeElement ?? null`.

Do not read the ref while building the workflow (`target: this.payButton()?.nativeElement`): the element is not rendered yet, so the step would get nothing.

### Wait for an element that appears later

The function can return a promise, for content that loads or opens after the tour has started. It receives a `signal` that aborts when the tour is cancelled or disposed, so a pending wait can stop:

```ts
.step({
  id: "results",
  target: async ({ signal }) => {
    await loadResults({ signal }); // your own async work
    return document.querySelector<HTMLElement>('[data-tour="results"]');
  },
  title: "Results",
  content: "Your matches appear here.",
})
```

### When no element is found

A selector that matches nothing, a function that returns `null`, or an element that is no longer in the page makes the step follow `behavior.missingTarget`. By default the tour fails with an error. Use `"wait"` to resolve the target again every 16 ms until a timeout (a function target is called each time, so keep it cheap), `"skip"` to move past the step, or `"detached"` to show the popover centered on the screen. See [Handling errors](/docs/guides/handling-errors#missing-target-strategies).

The target must be an HTML element of the page: an SVG element makes the tour fail with a `TypeError`. To highlight an SVG graphic, target its HTML container.

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
  GlowTourPreviousTrigger,
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
    GlowTourPreviousTrigger,
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
          <glow-tour-previous-trigger />
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

`injectGlowTour()` gives state to the component that starts the tour. Components rendered inside `GlowTourRoot` read the same state with `injectGlowTourContext()`, without receiving the tour. Create the counter as a child component so the root's injector is available:

```typescript
import { Component } from "@angular/core";
import { injectGlowTourContext } from "@glowhop/angular-tour";

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
  protected readonly state = injectGlowTourContext();
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

## Share one tour between components

When several components drive the same tour, for example a layout that renders it and pages that start it, create the tour once in a service with `createGlowTour()` and pass it to `injectGlowTour`:

```typescript
import { Injectable } from "@angular/core";
import { createGlowTour } from "@glowhop/angular-tour";

@Injectable({ providedIn: "root" })
export class TourService {
  readonly tour = createGlowTour();
}
```

```typescript
import { Component, inject } from "@angular/core";
import { injectGlowTour } from "@glowhop/angular-tour";
import { TourService } from "./tour.service";

@Component({
  selector: "app-help-button",
  standalone: true,
  template: `<button [disabled]="glow.status() === 'active'">Help</button>`,
})
export class HelpButton {
  readonly glow = injectGlowTour(inject(TourService).tour);
}
```

Render `<glow-tour-default [tour]="tour" />` once, with the service's tour. `injectGlowTour(tour)` reads a tour it is given and never disposes it. Outside components, drive the same instance directly with `tour.start(workflow)`, `tour.cancel()`, and `tour.state`.

## Angular 18+

GlowTour.js requires Angular 18 or later. The adapter uses Angular's new control-flow blocks (`@if`, `@for`) and standalone components exclusively.

## SSR

`GlowTourDefault` supports server-side rendering with `@angular/ssr`. The component renders as an inert container on the server and hydrates without errors on the client. See [Angular SSR](/docs/guides/ssr#angular-ssr) in the SSR guide for the setup.
