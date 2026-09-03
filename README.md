# Glow Tour

Glow Tour is a cross-framework guided-tour package inspired by Driver.js. The project is in `dev`, so breaking changes remain possible.

## Choose a package

- [`@glowhop/core-tour`](https://github.com/Glowhop/glow-tour/tree/main/packages/core): workflow controller and DOM driver; it renders through whichever adapter connects a root, so it isn't used standalone.
- [`@glowhop/styles-tour`](https://github.com/Glowhop/glow-tour/tree/main/packages/styles): scoped light theme.
- [`@glowhop/react-tour`](https://github.com/Glowhop/glow-tour/tree/main/packages/react), [`@glowhop/solid-tour`](https://github.com/Glowhop/glow-tour/tree/main/packages/solid), [`@glowhop/vue-tour`](https://github.com/Glowhop/glow-tour/tree/main/packages/vue), [`@glowhop/angular-tour`](https://github.com/Glowhop/glow-tour/tree/main/packages/angular): native framework adapters.
- [`@glowhop/vanilla-tour`](https://github.com/Glowhop/glow-tour/tree/main/packages/vanilla): browser custom elements.

## React quick start

```tsx
import { createRoot } from "react-dom/client";
import "@glowhop/styles-tour/default.css";
import { DefaultTour, createGlowTour } from "@glowhop/react-tour";

const tour = createGlowTour();
const workflow = tour.create("welcome").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
createRoot(document.getElementById("app")!).render(<><button id="welcome">Welcome</button><button type="button" onClick={() => void tour.run(workflow)}>Start tour</button><DefaultTour tour={tour} /></>);
```

Import the stylesheet once. Core owns workflow state, navigation, and DOM-level tour behavior, but nothing renders until an adapter connects a root and a popover; `@glowhop/core-tour/adapter` is the entry point for writing a new adapter (see [`packages/core/README.md`](https://github.com/Glowhop/glow-tour/blob/main/packages/core/README.md)). All published packages are ESM-only.

See [`docs/compatibility.md`](https://github.com/Glowhop/glow-tour/blob/main/docs/compatibility.md) for framework versions and verified SSR facts.

## Development and release

```bash
bun install --frozen-lockfile
bun run check && bun run typecheck && bun test && bun run build && bun run pack
```

Changesets versions the public packages together. A published GitHub Release triggers the OIDC npm workflow; see [`docs/release.md`](https://github.com/Glowhop/glow-tour/blob/main/docs/release.md).
