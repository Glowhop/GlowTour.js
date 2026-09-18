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

type InjectGlowTourResult = Pick<Tour, "advance" | "cancel" | "create" | "goTo" | "previous" | "start"> & {
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
    void this.glow.start(this.workflow);
  }
}
```

See the guide to [choose step targets](/docs/guides/angular#step-targets) and [share one tour between components](/docs/guides/angular#share-one-tour-between-components).

### `injectGlowTourContext()`

Reads the state of the tour rendered by the enclosing `glow-tour-root`, to build tour UI inside the root. To run a tour or read its state elsewhere, use `injectGlowTour`.

**Signature**:
```typescript
function injectGlowTourContext(): Signal<TourState | null>
```

**Returns**: A Signal containing the current tour state, or `null` if no tour is active.

**Usage**:
```typescript
import { Component } from "@angular/core";
import { injectGlowTourContext } from "@glowhop/angular-tour";

@Component({
  template: `
    @if (tourState(); as state) {
      <p>Status: {{ state.status }}</p>
    }
  `,
})
export class MyComponent {
  protected tourState = injectGlowTourContext();
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

**Inputs**:
```typescript
@Input({ required: true }) tour: Tour
@Input() idPrefix?: string // Prefix for internal element IDs
```

**Usage**:
```html
<glow-tour-default [tour]="tour" />
```

### `GlowTourRoot`

Root container. Selector: `glow-tour-root`. Every other composition component must be rendered inside it.

**Inputs**:
```typescript
@Input({ required: true }) tour: Tour
@Input() idPrefix?: string // Prefix for internal element IDs
```

`idPrefix` sets the prefix of the ids the root generates for ARIA relationships. Set it when a page renders several tours.

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

Decorative pointer indicator next to the target (not the popover arrow). Selector: `glow-tour-pointer`.

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

Title/header area inside the popover. Selector: `glow-tour-header`. Renders the step `title`, and nothing when the step has no title.

### `GlowTourContent`

Description content area inside the popover. Selector: `glow-tour-content`. Renders the step `content` in a polite live region.

### `GlowTourFooter`

Navigation button container. Selector: `glow-tour-footer`.

**Usage**:
```html
<glow-tour-footer>
  <!-- button components -->
</glow-tour-footer>
```

### Triggers

| Component | Selector | Inputs |
| --- | --- | --- |
| `GlowTourPreviousTrigger` | `glow-tour-previous-trigger` | `previousLabel?: string` (default `"Previous step"`), `ariaLabel?: string`, `disabled: boolean` |
| `GlowTourAdvanceTrigger` | `glow-tour-advance-trigger` | `advanceLabel?: string` (default `"Advance step"`), `finishLabel?: string` (default `"Finish tour"`, on the last step), `ariaLabel?: string`, `disabled: boolean` |
| `GlowTourCancelTrigger` | `glow-tour-cancel-trigger` | `ariaLabel?: string`, `disabled: boolean`. Its label is `"Skip"` |

Each trigger renders a `<button>`. The label is the button text and, without `ariaLabel`, its accessible name. Projected content replaces the button text. `disabled` accepts a boolean attribute and adds to the tour's own state: a trigger is also disabled when its navigation is not available, or when the step sets its control to `"disabled"`. To hide a trigger, see [Hiding a control's button](/docs/reference/builder#hiding-a-controls-button).

**Usage**:
```html
<glow-tour-footer>
  <glow-tour-cancel-trigger />
  <glow-tour-previous-trigger previousLabel="Previous" />
  <glow-tour-advance-trigger advanceLabel="Next" finishLabel="Done" />
</glow-tour-footer>
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
