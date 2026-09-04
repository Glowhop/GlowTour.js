# React Example

Minimal React example showing how to use Glow Tour with the React adapter.

## Quick Start

From the monorepo root:

```bash
cd examples/react
bun install
bun run dev
```

Open `http://localhost:5173` in your browser.

## What This Example Shows

- Using `createGlowTour()` to initialize a tour instance
- Building a workflow with `.create()` and `.step()`
- Rendering the `DefaultTour` component
- Triggering the tour with `tour.run(workflow)`

## API Used

- `createGlowTour()` from `@glowhop/react-tour`
- `DefaultTour` component
- Tour workflow builder
