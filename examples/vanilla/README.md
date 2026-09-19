# Vanilla JavaScript Example

Minimal vanilla JavaScript example showing how to use GlowTour.js without a framework.

## Quick Start

The example is part of the monorepo workspace and uses the local packages, so build them first. From the monorepo root:

```bash
bun install
bun run build
bun run --cwd examples/vanilla dev
```

Open `http://localhost:5173` in your browser.

## What This Example Shows

- Using `createGlowTour()` to initialize a tour instance
- Building a workflow with `.create()` and `.step()`
- Registering custom elements with `registerGlowTourElements()`
- Adding the complete tour UI with the `<glow-tour-default>` element
- Triggering the tour with `tour.start(workflow)`

## API Used

- `createGlowTour()` from `@glowhop/vanilla-tour`
- `registerGlowTourElements()` to register custom elements
- `<glow-tour-default>` to render the complete tour UI
- Tour workflow builder
- DOM APIs (createElement, addEventListener, etc.)
