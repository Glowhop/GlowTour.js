# Glow Tour

Glow Tour is a cross-framework guided-tour package inspired by Driver.js. It is in `dev`; breaking changes are still allowed.

## Choose a package

- [`@glowhop/core-tour`](https://github.com/Glowhop/glow-tour/tree/main/packages/core): controller and workflow engine; Core alone provides no presentation.
- [`@glowhop/styles-tour`](https://github.com/Glowhop/glow-tour/tree/main/packages/styles): scoped light theme.
- [`@glowhop/react-tour`](https://github.com/Glowhop/glow-tour/tree/main/packages/react), [`@glowhop/solid-tour`](https://github.com/Glowhop/glow-tour/tree/main/packages/solid), [`@glowhop/vue-tour`](https://github.com/Glowhop/glow-tour/tree/main/packages/vue), [`@glowhop/angular-tour`](https://github.com/Glowhop/glow-tour/tree/main/packages/angular): native framework adapters.
- [`@glowhop/vanilla-tour`](https://github.com/Glowhop/glow-tour/tree/main/packages/vanilla): browser custom elements.

## React quick start

```tsx
import "@glowhop/styles-tour/default.css";
import { DefaultTour, createGlowTour } from "@glowhop/react-tour";

const tour = createGlowTour();
const workflow = tour.create("welcome").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
// Render <DefaultTour tour={tour} /> once, then call this from an event:
await tour.run(workflow);
```

Import the stylesheet once. The theme is scoped to Glow Tour roots and is light-only; override its inherited tokens on an ancestor when needed.

See the [compatibility guide](https://github.com/Glowhop/glow-tour/blob/main/docs/compatibility.md) for exact framework and SSR/hydration support. All published packages are ESM-only. The Core `adapter` subpath is for adapter authors.

## Development and release

```bash
bun install --frozen-lockfile
bun run check && bun run typecheck && bun test && bun run build && bun run pack
```

The private playground is built separately. Changesets versions the seven public packages together; a published GitHub Release triggers the OIDC npm workflow. See the [release guide](https://github.com/Glowhop/glow-tour/blob/main/docs/release.md).
