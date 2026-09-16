# Vanilla JavaScript Example

Minimal vanilla JavaScript example showing how to use GlowTour.js without a framework.

## Quick Start

From the monorepo root:

```bash
cd examples/vanilla
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## What This Example Shows

- Using `createGlowTour()` to initialize a tour instance
- Building a workflow with `.create()` and `.step()`
- Registering custom elements with `registerGlowTourElements()`
- Adding the complete tour UI with the `<glow-tour-default>` element
- Triggering the tour with `tour.run(workflow)`

## API Used

- `createGlowTour()` from `@glowhop/vanilla-tour`
- `registerGlowTourElements()` to register custom elements
- `<glow-tour-default>` to render the complete tour UI
- Tour workflow builder
- DOM APIs (createElement, addEventListener, etc.)
