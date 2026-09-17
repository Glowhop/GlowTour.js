---
title: Angular API reference
description: API reference for @glowhop/angular-tour.
---

The Angular adapter (`@glowhop/angular-tour`) exports components and utility functions.

## Functions

### `injectGlowTour(source?)`

Runs a tour from a component. This is the main entry point: it returns the tour to render, its methods, and one signal per state field. Call it in an injection context, such as a field initializer.

**Signature**:
```typescript
function injectGlowTour(source?: GlowTourOptions | Tour): InjectGlowTourResult

type InjectGlowTourResult = Pick<Tour, "advance" | "cancel" | "create" | "goTo" | "previous" | "run"> & {
  readonly tour: Tour
} & { readonly [K in keyof TourState]: Signal<TourState[K]> }
```

**Parameters**:
- `source` - Options for a new tour, or an existing tour created with `createGlowTour()` to share it.

With options, the tour is disposed when the injector is destroyed. With a tour, the function only reads it and never disposes it.

**Usage**:
```typescript
import { Component } from "@angular/core";
import { GlowTourDefault, injectGlowTour } from "@glowhop/angular-tour";

@Component({
  standalone: true,
  imports: [GlowTourDefault],
  template: `
    <button [disabled]="glow.status() === 'active'" (click)="start()">Start tour</button>
    <glow-tour-default [tour]="glow.tour" />
  `,
})
export class Onboarding {
  readonly glow = injectGlowTour();
  private readonly workflow = this.glow
    .create("welcome")
    .step({ id: "search", target: '[data-tour="search"]', content: "Find anything here." })
    .build();

  start() {
    void this.glow.run(this.workflow);
  }
}
```

See the guide to [choose step targets](/docs/guides/angular#step-targets) and [share one tour between components](/docs/guides/angular#share-one-tour-between-components).

### `injectTourContext()`

Reads the state of the tour rendered by the enclosing `glow-tour-root`, to build tour UI inside the root. To run a tour or read its state elsewhere, use `injectGlowTour`.

**Signature**:
```typescript
function injectTourContext(): Signal<TourState | null>
```

**Returns**: A Signal containing the current tour state, or `null` if no tour is active.

**Usage**:
```typescript
import { Component } from "@angular/core";
import { injectTourContext } from "@glowhop/angular-tour";

@Component({
  template: `
    @if (tourState(); as state) {
      <p>Status: {{ state.status }}</p>
    }
  `,
})
export class MyComponent {
  protected tourState = injectTourContext();
}
```

### `createGlowTour(options?)`

Creates a tour instance to share between components, passed to `injectGlowTour(tour)`, or to drive outside components. Inherited from Core.

**Signature**:
```typescript
function createGlowTour(options?: GlowTourOptions): Tour
```

## Components

### `GlowTourDefault`

Pre-composed tour with overlay, popover, pointer, and all navigation buttons. Selector: `glow-tour-default`.

**Input**:
```typescript
@Input() tour: Tour
```

**Usage**:
```html
<glow-tour-default [tour]="tour" />
```

### `GlowTourRoot`

Root container. Selector: `glow-tour-root`.

**Input**:
```typescript
@Input() tour: Tour
```

**Usage**:
```html
<glow-tour-root [tour]="tour">
  <!-- child components -->
</glow-tour-root>
```

### `GlowTourOverlay`

Backdrop overlay component. Selector: `glow-tour-overlay`.

**Usage**:
```html
<glow-tour-overlay />
```

### `GlowTourPointer`

Decorative indicator/arrow pointing to the target. Selector: `glow-tour-pointer`.

**Input**:
```typescript
@Input() directionContent?: {
  top?: string | TemplateRef<unknown>
  bottom?: string | TemplateRef<unknown>
  left?: string | TemplateRef<unknown>
  right?: string | TemplateRef<unknown>
}
```

**Default glyphs** (when `directionContent` is not set):
- `top`: `👆`
- `bottom`: `👇`
- `left`: `👈`
- `right`: `👉`

**Usage** (default pointers):
```html
<glow-tour-pointer />
```

**Usage** (with custom string content):
```html
<glow-tour-pointer [directionContent]="{ top: '⬆️', bottom: '⬇️' }" />
```

**Usage** (with template references):
```html
<ng-template #customPointer>
  <span class="custom-arrow">↓</span>
</ng-template>

<glow-tour-pointer [directionContent]="{ bottom: customPointer }" />
```

### `GlowTourPopover`

Dialog container for tour content. Selector: `glow-tour-popover`.

**Usage**:
```html
<glow-tour-popover><!-- child components --></glow-tour-popover>
```

### `GlowTourHeader`

Title/header area inside the popover. Selector: `glow-tour-header`.

### `GlowTourContent`

Description content area inside the popover. Selector: `glow-tour-content`.

### `GlowTourFooter`

Navigation button container. Selector: `glow-tour-footer`.

**Usage**:
```html
<glow-tour-footer>
  <!-- button components -->
</glow-tour-footer>
```

### `GlowTourAdvanceTrigger`

Next step button. Selector: `glow-tour-advance-trigger`.

**Usage**:
```html
<glow-tour-advance-trigger />
```

### `GlowTourPreviousTrigger`

Previous step button. Selector: `glow-tour-previous-trigger`.

**Usage**:
```html
<glow-tour-previous-trigger />
```

### `GlowTourCancelTrigger`

Dismiss button. Selector: `glow-tour-cancel-trigger`.

**Usage**:
```html
<glow-tour-cancel-trigger />
```

## DI

Provide a tour instance via Angular's DI for use across components:

```typescript
import { Injectable } from "@angular/core";
import { createGlowTour } from "@glowhop/angular-tour";

@Injectable({ providedIn: "root" })
export class TourService {
  readonly tour = createGlowTour();
}
```

Then read and drive it from any component with `injectGlowTour`, which never disposes a tour it is given:

```typescript
@Component({
  // ...
})
export class MyComponent {
  readonly glow = injectGlowTour(inject(TourService).tour);
}
```

## Signals

`injectGlowTour()` exposes each state field as a signal (`glow.status()`, `glow.currentStepIndex()`). Outside an injection context, read the tour controller's store directly:

```typescript
const state = this.tour.state.get();
console.log(state.status);

// Subscribe to changes
this.tour.state.subscribe((newState) => {
  // react to changes
});
```

## Standalone components

All components are standalone and can be imported directly:

```typescript
import {
  GlowTourRoot,
  GlowTourOverlay,
  GlowTourPopover,
} from "@glowhop/angular-tour";

@Component({
  standalone: true,
  imports: [GlowTourRoot, GlowTourOverlay, GlowTourPopover],
  // ...
})
export class MyComponent {}
```

## Types

- `Tour` - Tour controller
- `InjectGlowTourResult` - Value returned by `injectGlowTour`
- `TourState` - Tour state
- `WorkflowDefinition` - Immutable workflow
- `StepPropsStore` - Step state store
- `PointerDirectionValue` - Value type for pointer directions (`string | TemplateRef<unknown>`)
- `PointerDirectionContent` - Content configuration for `GlowTourPointer` component directions
- `GlowTourOptions` - Options for `createGlowTour`
- `StartOptions` - Options for `tour.create`
