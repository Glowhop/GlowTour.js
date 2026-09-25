---
title: "Getting started: build your first product tour"
description: Install GlowTour.js and build your first product tour or onboarding tour in React, Vue, Angular, Solid or vanilla JavaScript, step by step.
---

GlowTour.js is an open-source product tour library with a shared core engine and framework-specific adapters. To build your first product tour or onboarding tour, choose the adapter for your framework, import the default theme, and describe the tour as a workflow.

:::note
This documentation describes GlowTour.js 1.4. If you are upgrading from 1.3, the [migration guide](/docs/migration/1-4/) lists what changes.
:::

## Installation

Install the adapter and default theme for your framework:

### React

```bash
npm i @glowhop/react-tour @glowhop/styles-tour
```

### Vue

```bash
npm i @glowhop/vue-tour @glowhop/styles-tour
```

### Solid

```bash
npm i @glowhop/solid-tour @glowhop/styles-tour
```

### Angular

```bash
npm i @glowhop/angular-tour @glowhop/styles-tour
```

### Vanilla

```bash
npm i @glowhop/vanilla-tour @glowhop/styles-tour
```

### Published packages

All packages are published on npm under the `@glowhop` scope:

| Package | npm |
| --- | --- |
| `@glowhop/core-tour` | [npmjs.com/package/@glowhop/core-tour](https://www.npmjs.com/package/@glowhop/core-tour) |
| `@glowhop/react-tour` | [npmjs.com/package/@glowhop/react-tour](https://www.npmjs.com/package/@glowhop/react-tour) |
| `@glowhop/vue-tour` | [npmjs.com/package/@glowhop/vue-tour](https://www.npmjs.com/package/@glowhop/vue-tour) |
| `@glowhop/solid-tour` | [npmjs.com/package/@glowhop/solid-tour](https://www.npmjs.com/package/@glowhop/solid-tour) |
| `@glowhop/angular-tour` | [npmjs.com/package/@glowhop/angular-tour](https://www.npmjs.com/package/@glowhop/angular-tour) |
| `@glowhop/vanilla-tour` | [npmjs.com/package/@glowhop/vanilla-tour](https://www.npmjs.com/package/@glowhop/vanilla-tour) |
| `@glowhop/styles-tour` | [npmjs.com/package/@glowhop/styles-tour](https://www.npmjs.com/package/@glowhop/styles-tour) |

The adapters depend on `@glowhop/core-tour`; you only install it directly if you build your own adapter.

## Quick start

### React

```tsx
import { createRoot } from "react-dom/client";
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, useGlowTour } from "@glowhop/react-tour";

function App() {
  const { tour, create, start } = useGlowTour();

  function startTour() {
    const workflow = create("welcome")
      .step({ id: "welcome", target: '[data-tour="welcome"]', title: "Welcome", content: "Hello." })
      .build();
    void start(workflow);
  }

  return (
    <>
      <button data-tour="welcome">Welcome</button>
      <button type="button" onClick={startTour}>
        Start tour
      </button>
      <GlowTourDefault tour={tour} />
    </>
  );
}

createRoot(document.getElementById("app")!).render(<App />);
```

### Vue

```vue
<script setup lang="ts">
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, useGlowTour } from "@glowhop/vue-tour";

const { tour, create, start } = useGlowTour();
const workflow = create("welcome")
  .step({ id: "welcome-2", target: '[data-tour="welcome"]', title: "Welcome", content: "Hello." })
  .build();
</script>

<template>
  <button data-tour="welcome">Welcome</button>
  <button type="button" @click="start(workflow)">Start tour</button>
  <GlowTourDefault :tour="tour" />
</template>
```

### Solid

```tsx
import { render } from "solid-js/web";
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, useGlowTour } from "@glowhop/solid-tour";

function App() {
  const { tour, create, start } = useGlowTour();
  const workflow = create("welcome")
    .step({ id: "welcome-3", target: '[data-tour="welcome"]', title: "Welcome", content: "Hello." })
    .build();

  return (
    <>
      <button data-tour="welcome">Welcome</button>
      <button type="button" onClick={() => void start(workflow)}>
        Start tour
      </button>
      <GlowTourDefault tour={tour} />
    </>
  );
}

render(() => <App />, document.getElementById("app")!);
```

### Angular

```typescript
import { Component } from "@angular/core";
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, injectGlowTour } from "@glowhop/angular-tour";

@Component({
  standalone: true,
  imports: [GlowTourDefault],
  template: `
    <button data-tour="welcome">Welcome</button>
    <button type="button" (click)="start()">Start tour</button>
    <glow-tour-default [tour]="glow.tour" />
  `,
})
export class TourComponent {
  readonly glow = injectGlowTour();
  private readonly workflow = this.glow
    .create("welcome")
    .step({ id: "welcome-4", target: '[data-tour="welcome"]', title: "Welcome", content: "Hello." })
    .build();

  start() {
    void this.glow.start(this.workflow);
  }
}
```

### Vanilla

```typescript
import "@glowhop/styles-tour/default.css";
import {
  createGlowTour,
  registerGlowTourElements,
} from "@glowhop/vanilla-tour";

registerGlowTourElements();

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({ id: "welcome-5", target: "#welcome", title: "Welcome", content: "Hello." })
  .build();

const button = document.createElement("button");
button.id = "welcome";
button.textContent = "Welcome";
document.body.append(button);

const startButton = document.createElement("button");
startButton.type = "button";
startButton.textContent = "Start tour";
startButton.addEventListener("click", () => void tour.start(workflow));
document.body.append(startButton);

const root = document.createElement("glow-tour-default");
root.tour = tour;
document.body.append(root);
```

## Key concepts

### Tour

A tour is the controller: the state machine that manages workflow execution, navigation, and lifecycle. In a component, `useGlowTour()` (Angular: `injectGlowTour()`) creates one and returns its state in the framework's reactive form. To share a tour across components, or outside a framework, create it with `createGlowTour()` and keep it alive for the lifetime of your app. A tour can run multiple workflows sequentially or restart the same one.

### Workflow

A workflow is an immutable sequence of steps. Create one by calling `tour.create(name).step(...).build()`. Each step describes what to highlight and what to show to the user.

### Step

A step pairs a target (an element to highlight) with content (a title and description). Steps control placement, scrolling, interaction permissions, and callbacks. The popover and pointer position themselves around the target and respond to collisions by falling back to different placements or centering.

### Popover

The popover is the info box that appears during a step. It contains the title, description, and navigation buttons: advance, previous, and cancel (labelled Skip). Every adapter renders the same structure with the same ARIA semantics and keyboard shortcuts.

### Pointer

The pointer is a decorative indicator shown next to the target, with a glyph for each direction. It follows the target, and its placement is configured with the `indicator` options. It is distinct from the popover arrow, the small triangle attached to the popover and configured with `popover.arrow`.

## Next steps

- **Learn framework-specific setup**: Read the guide for your framework under Guides.
- **Customize the tour**: Explore theming to match your brand colors and spacing.
- **Add programmatic control**: Use state subscriptions and actions to sequence complex tours.
- **Check accessibility**: Review the accessibility guide to ensure your tour meets WCAG standards.
