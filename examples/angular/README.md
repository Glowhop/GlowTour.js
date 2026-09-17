# Angular Example

Minimal Angular example showing how to use GlowTour.js with the Angular adapter.

## Quick Start

The example is part of the monorepo workspace and uses the local packages, so build them first. From the monorepo root:

```bash
bun install
bun run build
bun run --cwd examples/angular dev
```

Open `http://localhost:5173` in your browser.

## What This Example Shows

- Using `createGlowTour()` to initialize a tour instance
- Building a workflow with `.create()` and `.step()`
- Rendering the `GlowTourDefault` component
- Triggering the tour with `tour.start(workflow)`

## API Used

- `createGlowTour()` from `@glowhop/angular-tour`
- `GlowTourDefault` component
- Tour workflow builder
- Angular standalone component with `@Component` decorator
