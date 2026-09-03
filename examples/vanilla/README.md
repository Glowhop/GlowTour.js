# Vanilla JavaScript Example

Minimal vanilla JavaScript example showing how to use Glow Tour without a framework.

## Quick Start

From the monorepo root:

```bash
cd examples/vanilla
bun install
bun run dev
```

Open `http://localhost:5173` in your browser.

## What This Example Shows

- Using `createGlowTour()` to initialize a tour instance
- Building a workflow with `.create()` and `.step()`
- Registering custom elements with `registerGlowTourElements()`
- Creating a tour component with `createDefaultTourElement()`
- Triggering the tour with `tour.run(workflow)`

## API Used

- `createGlowTour()` from `@glowhop/vanilla-tour`
- `registerGlowTourElements()` to register custom elements
- `createDefaultTourElement()` to create the tour root element
- Tour workflow builder
- DOM APIs (createElement, addEventListener, etc.)
