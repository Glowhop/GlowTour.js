# Angular Example

Minimal Angular example showing how to use Glow Tour with the Angular adapter.

## Quick Start

From the monorepo root:

```bash
cd examples/angular
bun install
bun run dev
```

Open `http://localhost:5173` in your browser.

## What This Example Shows

- Using `createGlowTour()` to initialize a tour instance
- Building a workflow with `.create()` and `.step()`
- Rendering the `GlowTourDefault` component
- Triggering the tour with `tour.run(workflow)`

## API Used

- `createGlowTour()` from `@glowhop/angular-tour`
- `GlowTourDefault` component
- Tour workflow builder
- Angular standalone component with `@Component` decorator
