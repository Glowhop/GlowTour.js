---
title: Getting started
description: Install Glow Tour and build your first guided tour.
---

Glow Tour is a cross-framework guided-tour library with a shared core engine and framework-specific adapters. Choose the adapter for your framework, import the default theme, and build your first workflow.

## Installation

Install the adapter and default theme for your framework:

### React

```bash
bun add @glowhop/react-tour @glowhop/styles-tour
```

### Vue

```bash
bun add @glowhop/vue-tour @glowhop/styles-tour
```

### Solid

```bash
bun add @glowhop/solid-tour @glowhop/styles-tour
```

### Angular

```bash
bun add @glowhop/angular-tour @glowhop/styles-tour
```

### Vanilla

```bash
bun add @glowhop/vanilla-tour @glowhop/styles-tour
```

## Quick start

### React

```tsx
import { createRoot } from "react-dom/client";
import "@glowhop/styles-tour/default.css";
import { DefaultTour, createGlowTour } from "@glowhop/react-tour";

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({ target: "#welcome", title: "Welcome", content: "Hello." })
  .build();

createRoot(document.getElementById("app")!).render(
  <>
    <button id="welcome">Welcome</button>
    <button type="button" onClick={() => void tour.run(workflow)}>
      Start tour
    </button>
    <DefaultTour tour={tour} />
  </>
);
```

### Vue

```vue
<script setup lang="ts">
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, createGlowTour } from "@glowhop/vue-tour";

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({ target: "#welcome", title: "Welcome", content: "Hello." })
  .build();

function start() {
  void tour.run(workflow);
}
</script>

<template>
  <button id="welcome">Welcome</button>
  <button type="button" @click="start">Start tour</button>
  <GlowTourDefault :tour="tour" />
</template>
```

### Solid

```tsx
import { render } from "solid-js/web";
import "@glowhop/styles-tour/default.css";
import { DefaultTour, createGlowTour } from "@glowhop/solid-tour";

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({ target: "#welcome", title: "Welcome", content: "Hello." })
  .build();

render(() => (
  <>
    <button id="welcome">Welcome</button>
    <button type="button" onClick={() => void tour.run(workflow)}>
      Start tour
    </button>
    <DefaultTour tour={tour} />
  </>
), document.getElementById("app")!);
```

### Angular

```typescript
import { Component } from "@angular/core";
import "@glowhop/styles-tour/default.css";
import { createGlowTour, GlowTourDefault } from "@glowhop/angular-tour";

@Component({
  standalone: true,
  imports: [GlowTourDefault],
  template: `
    <button id="welcome">Welcome</button>
    <button type="button" (click)="start()">Start tour</button>
    <glow-tour-default [tour]="tour" />
  `,
})
export class TourComponent {
  readonly tour = createGlowTour();
  readonly workflow = this.tour
    .create("welcome")
    .step({ target: "#welcome", title: "Welcome", content: "Hello." })
    .build();

  start() {
    void this.tour.run(this.workflow);
  }
}
```

### Vanilla

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
  .create("welcome")
  .step({ target: "#welcome", title: "Welcome", content: "Hello." })
  .build();

const button = document.createElement("button");
button.id = "welcome";
button.textContent = "Welcome";
document.body.append(button);

const startButton = document.createElement("button");
startButton.type = "button";
startButton.textContent = "Start tour";
startButton.addEventListener("click", () => void tour.run(workflow));
document.body.append(startButton);

const root = createDefaultTourElement(tour);
document.body.append(root);
```

## Key concepts

### Tour

A tour is the controller: the state machine that manages workflow execution, navigation, and lifecycle. Create one with `createGlowTour()` and keep it alive for the lifetime of your app. A tour can run multiple workflows sequentially or restart the same one.

### Workflow

A workflow is an immutable sequence of steps. Create one by calling `tour.create(name).step(...).build()`. Each step describes what to highlight and what to show to the user.

### Step

A step pairs a target (an element to highlight) with content (a title and description). Steps control placement, scrolling, interaction permissions, and callbacks. The popover and pointer position themselves around the target and respond to collisions by falling back to different placements or centering.

### Popover

The popover is the info box that appears during a step. It contains the title, description, and navigation buttons (Advance, Previous, Cancel). Every adapter renders the same structure with the same ARIA semantics and keyboard shortcuts.

### Pointer

The pointer (or indicator) is the visual indicator that highlights or points to the target element. It follows the target and responds to placement changes. The default styles include a semi-transparent backdrop and an arrow or shape.

## Next steps

- **Learn framework-specific setup**: Read the guide for your framework under Guides.
- **Customize the tour**: Explore theming to match your brand colors and spacing.
- **Add programmatic control**: Use state subscriptions and actions to sequence complex tours.
- **Check accessibility**: Review the accessibility guide to ensure your tour meets WCAG standards.
