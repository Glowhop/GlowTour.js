---
title: Vanilla guide
description: Build guided tours with @glowhop/vanilla-tour.
---

Glow Tour's Vanilla adapter uses native custom elements. Content is HTML and text. No framework required — works in any DOM-based application.

## Setup

Install the package and import the default theme:

```bash
bun add @glowhop/vanilla-tour @glowhop/styles-tour
```

```typescript
import "@glowhop/styles-tour/default.css";
import {
  createDefaultTourElement,
  createGlowTour,
  registerGlowTourElements,
} from "@glowhop/vanilla-tour";
```

## Registering elements

Register the custom elements before creating a tour:

```typescript
import { registerGlowTourElements } from "@glowhop/vanilla-tour";

registerGlowTourElements();
```

The pure entry point requires explicit registration. Alternatively, import from `@glowhop/vanilla-tour/auto` for auto-registration as a side effect.

## Complete example

```typescript
import "@glowhop/styles-tour/default.css";
import {
  createDefaultTourElement,
  createGlowTour,
  registerGlowTourElements,
} from "@glowhop/vanilla-tour";

registerGlowTourElements();

const tour = createGlowTour();

const workflow = tour
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

// Create the root tour element and append it
const tourRoot = createDefaultTourElement(tour);
document.body.append(tourRoot);

// Create and wire up a start button
const startButton = document.querySelector("#start-tour") as HTMLButtonElement;
startButton.addEventListener("click", () => void tour.run(workflow));
```

In your HTML:

```html
<!doctype html>
<html>
  <head>
    <title>Glow Tour - Vanilla</title>
  </head>
  <body>
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
      <button id="start-tour">Start tour</button>
    </main>
    <script src="./main.ts"></script>
  </body>
</html>
```

## Custom composition

Build a custom layout by creating and composing custom elements directly:

```typescript
import { registerGlowTourElements } from "@glowhop/vanilla-tour";
import { createGlowTour } from "@glowhop/vanilla-tour";

registerGlowTourElements();

const tour = createGlowTour();

// Create the root element
const root = document.createElement("glow-tour-root");
root.tour = tour;

// Create overlay and popover
const overlay = document.createElement("glow-tour-overlay");
const popover = document.createElement("glow-tour-popover");

// Create header, content, and footer
const header = document.createElement("glow-tour-header");
const content = document.createElement("glow-tour-content");
const footer = document.createElement("glow-tour-footer");

// Create trigger buttons
const advanceTrigger = document.createElement("glow-tour-advance-trigger");
const cancelTrigger = document.createElement("glow-tour-cancel-trigger");

// Compose the tree
footer.append(cancelTrigger, advanceTrigger);
popover.append(header, content, footer);
root.append(overlay, popover);

document.body.append(root);
```

## Custom element API

Each custom element exposes properties and follows standard DOM patterns:

- **`glow-tour-root`**: Set `tour` property to the tour instance.
- **Triggers** (`glow-tour-advance-trigger`, `glow-tour-cancel-trigger`, `glow-tour-previous-trigger`): Set `disabled` to control availability from your code.
- **All elements**: Use standard `addEventListener` and DOM APIs for styling and interaction.

## Modern browsers

Glow Tour's Vanilla adapter requires modern browser support for custom elements and the Shadow DOM API. It works in all modern browsers (Chrome 77+, Firefox 63+, Safari 13+, Edge 79+).

## SSR

Custom elements don't render on the server; they only upgrade once connected to a live DOM. The package is DOM-free to import. See the compatibility table for details.
