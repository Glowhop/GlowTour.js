---
title: Angular API reference
description: API reference for @glowhop/angular-tour.
---

The Angular adapter (`@glowhop/angular-tour`) exports components and utility functions.

## Functions

### `createGlowTour(options?)`

Creates a tour controller instance. Inherited from Core.

**Signature**:
```typescript
function createGlowTour(options?: GlowTourOptions): Tour
```

### `injectGlowTour()`

Accesses the tour state Signal via Angular's dependency injection. Must be called from a component inside a `glow-tour-root`.

**Signature**:
```typescript
function injectGlowTour(): Signal<TourState | null>
```

**Returns**: A Signal containing the current tour state, or `null` if no tour is active.

**Usage**:
```typescript
import { Component } from "@angular/core";
import { injectGlowTour } from "@glowhop/angular-tour";

@Component({
  template: `
    @if (tourState(); as state) {
      <p>Status: {{ state.status }}</p>
    }
  `,
})
export class MyComponent {
  protected tourState = injectGlowTour();
}
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

**Usage**:
```html
<glow-tour-pointer />
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

### `GlowTourBackTrigger`

Previous step button. Selector: `glow-tour-back-trigger`.

**Usage**:
```html
<glow-tour-back-trigger />
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

Then inject it:

```typescript
@Component({
  // ...
})
export class MyComponent {
  constructor(public tourService: TourService) {}
}
```

## Signals

Tour state is managed via Angular signals internally. Access state via the tour controller:

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
- `TourState` - Tour state
- `WorkflowDefinition` - Immutable workflow
- `StepPropsStore` - Step state store
- `GlowTourOptions` - Options for `createGlowTour`
- `StartOptions` - Options for `tour.create`
