# Vue Example

Minimal Vue 3 example showing how to use Glow Tour with the Vue adapter.

## Quick Start

From the monorepo root:

```bash
cd examples/vue
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

- `createGlowTour()` from `@glowhop/vue-tour`
- `GlowTourDefault` component
- Tour workflow builder
- Vue 3 Composition API with `<script setup>`
