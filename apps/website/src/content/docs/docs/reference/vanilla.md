---
title: Vanilla API reference
description: API reference for @glowhop/vanilla-tour.
---

The Vanilla adapter (`@glowhop/vanilla-tour`) exports custom element utilities and functions.

## Functions

### `createGlowTour(options?)`

Creates a tour controller instance. Inherited from Core.

**Signature**:
```typescript
function createGlowTour(options?: GlowTourOptions): VanillaGlowTour
```

### `registerGlowTourElements()`

Registers all custom elements as side effects. Call once before creating tours.

**Signature**:
```typescript
function registerGlowTourElements(): void
```

**Usage**:
```typescript
import { registerGlowTourElements } from "@glowhop/vanilla-tour";

registerGlowTourElements();
// Elements are now available: glow-tour-root, glow-tour-overlay, etc.
```

### `createDefaultTourElement(tour)`

Creates a pre-composed tour element tree (overlay, popover, pointer, buttons).

**Signature**:
```typescript
function createDefaultTourElement(
  tour: VanillaGlowTour,
  options?: CreateDefaultTourElementOptions
): GlowTourRootElement
```

**Returns**: A `glow-tour-root` custom element ready to append to the DOM

**Usage**:
```typescript
const root = createDefaultTourElement(tour);
document.body.append(root);
```

## Custom elements

### `glow-tour-root`

Root container for the entire tour.

**Properties**:
- `tour: VanillaGlowTour` - Set the tour instance

**Usage**:
```typescript
const root = document.createElement("glow-tour-root");
root.tour = tour;
```

### `glow-tour-overlay`

Backdrop overlay behind the target element.

**Usage**:
```typescript
const overlay = document.createElement("glow-tour-overlay");
root.append(overlay);
```

### `glow-tour-popover`

Dialog container with title, content, and footer.

**Usage**:
```typescript
const popover = document.createElement("glow-tour-popover");
root.append(popover);
```

### `glow-tour-header`

Title/header area inside the popover.

### `glow-tour-content`

Description content area inside the popover.

### `glow-tour-footer`

Footer area containing navigation buttons.

### `glow-tour-pointer`

Decorative indicator/arrow pointing to the target.

**Usage**:
```typescript
const pointer = document.createElement("glow-tour-pointer");
root.append(pointer);
```

### `glow-tour-advance-trigger`

"Next" button to advance to the next step.

**Properties**:
- `disabled: boolean` - Disable the button

**Usage**:
```typescript
const button = document.createElement("glow-tour-advance-trigger");
button.addEventListener("click", () => tour.advance());
footer.append(button);
```

### `glow-tour-cancel-trigger`

"Cancel" button to dismiss the tour.

**Properties**:
- `disabled: boolean` - Disable the button

### `glow-tour-previous-trigger`

"Previous" button to go back to the previous step.

**Properties**:
- `disabled: boolean` - Disable the button

## Element names

Constant of all registered element names:

**Signature**:
```typescript
const GLOW_TOUR_ELEMENT_NAMES: {
  root: "glow-tour-root"
  overlay: "glow-tour-overlay"
  popover: "glow-tour-popover"
  pointer: "glow-tour-pointer"
  header: "glow-tour-header"
  content: "glow-tour-content"
  footer: "glow-tour-footer"
  advanceTrigger: "glow-tour-advance-trigger"
  cancelTrigger: "glow-tour-cancel-trigger"
  previousTrigger: "glow-tour-previous-trigger"
}
```

## Auto-registration

Import from `@glowhop/vanilla-tour/auto` to auto-register elements:

```typescript
import { createGlowTour } from "@glowhop/vanilla-tour/auto";
// Elements are already registered

const tour = createGlowTour();
```

## Custom element API pattern

All custom elements follow standard DOM patterns:

- Properties: Set with `element.property = value`
- Events: Listen with `element.addEventListener()`
- Attributes: Standard HTML attributes for styling (class, style, data-*)
- Children: Append/append child elements normally

## Complete example

```typescript
import { registerGlowTourElements, createGlowTour } from "@glowhop/vanilla-tour";

registerGlowTourElements();

const tour = createGlowTour();

// Create elements
const root = document.createElement("glow-tour-root");
root.tour = tour;

const overlay = document.createElement("glow-tour-overlay");
const popover = document.createElement("glow-tour-popover");

const header = document.createElement("glow-tour-header");
const content = document.createElement("glow-tour-content");
const footer = document.createElement("glow-tour-footer");

const advanceBtn = document.createElement("glow-tour-advance-trigger");
const cancelBtn = document.createElement("glow-tour-cancel-trigger");

// Compose the tree
footer.append(cancelBtn, advanceBtn);
popover.append(header, content, footer);
root.append(overlay, popover);

document.body.append(root);

// Now you can run tours
const workflow = tour.create("demo").step({ /* ... */ }).build();
await tour.run(workflow);
```

## Types

- `VanillaGlowTour` - Tour controller
- `VanillaTourContent` - Content type
- `TourState` - Tour state
- `WorkflowDefinition` - Immutable workflow
- `StepPropsStore` - Step state store
- `GlowTourRootElement` - Root element type
- `CreateDefaultTourElementOptions` - Options for `createDefaultTourElement`
