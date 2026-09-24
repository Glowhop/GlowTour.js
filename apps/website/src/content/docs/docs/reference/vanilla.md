---
title: Vanilla API reference
description: "API reference for @glowhop/vanilla-tour: createGlowTour, registerGlowTourElements and the custom elements for vanilla JavaScript product tours."
---

The Vanilla adapter (`@glowhop/vanilla-tour`) exports custom element utilities and functions.

## Functions

### `createGlowTour(options?)`

Creates a tour controller instance. Inherited from Core.

**Signature**:
```typescript
function createGlowTour(options?: GlowTourOptions): Tour
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

## Custom elements

### `glow-tour-default`

A complete tour: a `glow-tour-root` with the overlay, pointer, popover, header, content, footer and the three controls. The structure is built the first time the element is connected.

**Properties**:
- `tour: Tour | null` - The tour instance
- `idPrefix: string | undefined` - Prefix for internal element IDs, also set with the `id-prefix` attribute

**Usage**:
```typescript
const element = document.createElement("glow-tour-default");
element.tour = tour;
document.body.append(element);
```

### `glow-tour-root`

Root container for the entire tour.

**Properties**:
- `tour: Tour` - Set the tour instance

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

Title/header area inside the popover. Renders the step `title`: a string as text, a `Node` as a child element.

### `glow-tour-content`

Description content area inside the popover. Renders the step `content`: a string as text, a `Node` (image, video, any markup) as a child element. See [Rich content](/docs/guides/vanilla/#rich-content-images-and-video).

### `glow-tour-footer`

Footer area containing navigation buttons.

### `glow-tour-pointer`

Decorative pointer indicator next to the target (not the popover arrow).

**Properties**:
- `directionContent: PointerDirectionContent` - Custom content for pointer directions

**Default glyphs** (when `directionContent` is not set):
- `top`: `👆`
- `bottom`: `👇`
- `left`: `👈`
- `right`: `👉`

**Usage** (default pointers):
```typescript
const pointer = document.createElement("glow-tour-pointer");
root.append(pointer);
```

**Usage** (with custom string content):
```typescript
const pointer = document.createElement("glow-tour-pointer");
pointer.directionContent = {
  top: "⬆️",
  bottom: "⬇️",
  left: "⬅️",
  right: "➡️"
};
root.append(pointer);
```

**Usage** (with custom DOM nodes):
```typescript
const pointer = document.createElement("glow-tour-pointer");
const customArrow = document.createElement("span");
customArrow.textContent = "↓";
customArrow.style.fontSize = "2em";

pointer.directionContent = {
  bottom: customArrow
};
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
const GLOW_TOUR_ELEMENT_NAMES: readonly [
  "glow-tour-root",
  "glow-tour-header",
  "glow-tour-content",
  "glow-tour-footer",
  "glow-tour-popover",
  "glow-tour-pointer",
  "glow-tour-previous-trigger",
  "glow-tour-advance-trigger",
  "glow-tour-cancel-trigger",
  "glow-tour-overlay",
]
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

## Types

- `Tour` - Tour controller
- `VanillaTourContent` - Content type for `title` and `content`: `string | Node`
- `TourState` - Tour state
- `WorkflowDefinition` - Immutable workflow
- `StepPropsStore` - Step state store
- `GlowTourRootElement` - Root element type
- `GlowTourPointerElement` - Pointer element type
- `PointerDirectionContent` - Content configuration for pointer directions
- `GlowTourDefaultElement` - Default tour element type
