---
title: How to build a product tour in vanilla JavaScript
description: "Build a product tour or onboarding tour without a framework using @glowhop/vanilla-tour and native custom elements: setup, steps, content and theming."
---

This guide shows how to build a product tour or onboarding tour in plain JavaScript with `@glowhop/vanilla-tour`, the GlowTour.js vanilla adapter. It uses native custom elements. Content is HTML and text. No framework required - works in any DOM-based application.

## Setup

Install the adapter and the default theme:

```bash
npm i @glowhop/vanilla-tour @glowhop/styles-tour
```

Register the custom elements before creating a tour. The pure entry point requires this explicit call; alternatively, import from `@glowhop/vanilla-tour/auto` to register them as a side effect. The complete example below imports the theme and registers the elements.

## Complete example

```typescript
import "@glowhop/styles-tour/default.css";
import {
  createGlowTour,
  registerGlowTourElements,
} from "@glowhop/vanilla-tour";

registerGlowTourElements();

const tour = createGlowTour();

const workflow = tour
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

// Create the root tour element and append it
const tourRoot = document.createElement("glow-tour-default");
tourRoot.tour = tour;
document.body.append(tourRoot);

// Create and wire up a start button
const startButton = document.querySelector("#start-tour") as HTMLButtonElement;
startButton.addEventListener("click", () => void tour.start(workflow));
```

In your `index.html`, loaded by a bundler such as Vite that compiles `main.ts` and resolves the package imports:

```html
<!doctype html>
<html>
  <head>
    <title>GlowTour.js - Vanilla</title>
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
    <script type="module" src="/main.ts"></script>
  </body>
</html>
```

## Customize progressively

`<glow-tour-default>` is the shortest path to a complete tour. Keep it while you only need visual changes, then compose the custom elements directly when you need to change the popover structure.

### Style the default tour with CSS

The default element reads the theme's CSS custom properties, so colors, spacing, and shape can change without replacing any elements:

```css
:where([data-glow-tour-root]) {
  --glow-tour-color-accent: #7c3aed;
  --glow-tour-color-surface: #faf5ff;
  --glow-tour-radius: 16px;
}
```

Keep using `<glow-tour-default>`. See the [theming guide](/docs/guides/theming/) for all available tokens.

### Compose the default layout

When you need to add, remove, or rearrange content, expand the default tour into the custom elements it creates for you:

```typescript
const root = document.createElement("glow-tour-root");
root.tour = tour;

const overlay = document.createElement("glow-tour-overlay");
const pointer = document.createElement("glow-tour-pointer");
const popover = document.createElement("glow-tour-popover");
const header = document.createElement("glow-tour-header");
const content = document.createElement("glow-tour-content");
const footer = document.createElement("glow-tour-footer");

const cancelTrigger = document.createElement("glow-tour-cancel-trigger");
const previousTrigger = document.createElement("glow-tour-previous-trigger");
const advanceTrigger = document.createElement("glow-tour-advance-trigger");

footer.append(cancelTrigger, previousTrigger, advanceTrigger);
popover.append(header, content, footer);
root.append(overlay, pointer, popover);
document.body.append(root);
```

### Add a custom step counter

Vanilla custom elements do not have a framework context hook, so give the custom counter the tour instance and let it manage its own subscription:

```typescript
import type { Tour, TourState } from "@glowhop/vanilla-tour";

class StepCounter extends HTMLElement {
  #tour?: Tour;
  #unsubscribe?: () => void;

  set tour(tour: Tour) {
    this.#tour = tour;
    if (this.isConnected) this.#subscribe();
  }

  connectedCallback() {
    this.#subscribe();
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  #subscribe() {
    this.#unsubscribe?.();
    if (!this.#tour) return;

    const render = (state: TourState) => {
      const visible = state.currentStepIndex >= 0 && state.totalSteps > 0;
      this.hidden = !visible;
      this.textContent = visible
        ? `Step ${state.currentStepIndex + 1} of ${state.totalSteps}`
        : "";
    };

    render(this.#tour.state.get());
    this.#unsubscribe = this.#tour.state.subscribe(render);
  }
}

customElements.define("tour-step-counter", StepCounter);

const stepCounter = new StepCounter();
stepCounter.tour = tour;
popover.insertBefore(stepCounter, content);
```

To have assistive technologies announce the complete counter when it changes, you can call `stepCounter.setAttribute("aria-live", "polite")` and `stepCounter.setAttribute("aria-atomic", "true")`. `glow-tour-content` is already a polite live region, so enable a second one only when the counter conveys useful distinct information, and test the result with a screen reader.

See the runnable [Live step counter example](/examples/).

### Subscribe outside the composition

Any application code can read and subscribe to the same store without creating a tour component:

```typescript
const status = document.querySelector("#tour-status") as HTMLOutputElement;

function bindTourStatus(status: HTMLOutputElement) {
  const render = (state: TourState) => {
    status.textContent = `Tour status: ${state.status}`;
  };

  render(tour.state.get());
  return tour.state.subscribe(render);
}

const stopStatusUpdates = bindTourStatus(status);

// Later, in your route or component teardown:
// stopStatusUpdates();
```

`tour.state.get()` returns the current snapshot. `tour.state.subscribe(listener)` returns the unsubscribe function; call `stopStatusUpdates()` from the lifecycle that removes this UI. See [Programmatic control](/docs/guides/programmatic-control/) for the complete state contract.

## Rich content: images and video

`title` and `content` accept either a string or a DOM `Node` (`VanillaTourContent = string | Node`). Strings are rendered as text, never parsed as HTML. Pass a node when a step needs an image, a video, or any other markup:

```typescript
function exportMedia() {
  const figure = document.createElement("figure");

  const video = document.createElement("video");
  video.src = "/videos/export.mp4";
  video.controls = true;
  video.muted = true;
  video.playsInline = true;
  video.width = 320;
  video.height = 180;

  const caption = document.createElement("figcaption");
  caption.textContent = "Export your data as CSV in one click.";

  figure.append(video, caption);
  return figure;
}

const workflow = tour
  .create("export-tour")
  .step({
    id: "export",
    target: "#export",
    title: "Export your data",
    content: exportMedia(),
  })
  .build();
```

The node is inserted as-is in `glow-tour-content` (or `glow-tour-header`). Keep these rules in mind:

- **Keep `title` textual.** The header labels the popover dialog (`aria-labelledby`), so screen readers announce its text. Put images and videos in `content`.
- **Make media accessible.** Give images a meaningful `alt` (or `alt=""` when decorative). For video, show `controls`, avoid autoplay with sound, and add a `<track kind="captions">` when the video contains speech.
- **Reserve the media size.** Set `width`/`height` or a CSS `aspect-ratio` so the popover does not jump while the media loads.
- **Build HTML with DOM APIs, not `innerHTML`.** If content comes from a CMS or translations, sanitize it before turning it into nodes.
- **A node lives in one place.** Leaving the step detaches the node (the browser pauses a detached video) and going back re-attaches the same node, so a video resumes where it stopped. If several `glow-tour-root` elements display the same step at once, create one node per root.

## Custom element API

Each custom element exposes properties and follows standard DOM patterns:

- **`glow-tour-root`**: Set `tour` property to the tour instance.
- **Triggers** (`glow-tour-advance-trigger`, `glow-tour-cancel-trigger`, `glow-tour-previous-trigger`): Set `disabled` to control availability from your code.
- **All elements**: Use standard `addEventListener` and DOM APIs for styling and interaction.

## Modern browsers

The GlowTour.js Vanilla adapter requires modern browser support for custom elements and the Shadow DOM API. It works in all modern browsers (Chrome 77+, Firefox 63+, Safari 13+, Edge 79+).

## SSR

Custom elements don't render on the server; they only upgrade once connected to a live DOM. The package is DOM-free to import. See the compatibility table for details.
