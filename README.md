<!--
  ────────────────────────────────────────────────────────────────────────────
  ASSETS TO ADD — every placeholder below is an HTML comment, so the README
  renders clean until you drop the file in and uncomment the line above it.

  Put them in `.github/assets/` (that folder is not published to npm):

  [ ] .github/assets/social-preview.png   1280×640  — GitHub "Social preview"
                                          (Settings → General → Social preview).
                                          Not referenced here; upload only.
  [ ] .github/assets/hero.png             1280×640  — logo + tagline banner,
                                          shown at the very top.
  [ ] .github/assets/demo.gif             ≤1200px wide, ≤10 MB, 8–12 s loop —
                                          a 3-step tour running in a real app.
                                          This is the single most important
                                          asset: it is what people judge the
                                          library on before reading a word.
  [ ] .github/assets/theming.gif          ≤1000px wide, ~6 s — the default theme
                                          morphing into a custom-token skin.
  [ ] .github/assets/placement.png        ≤1000px wide — one screenshot showing
                                          top/bottom/left/right placement.

  Record the GIFs from the live gallery at https://glowtour.dev/examples.
  ────────────────────────────────────────────────────────────────────────────
-->

<!-- <p align="center"><img src=".github/assets/hero.png" alt="GlowTour.js — guided product tours for React, Vue, Solid, Angular and vanilla JavaScript" width="820"></p> -->

<h1 align="center">GlowTour.js</h1>

<p align="center">
  <strong>Guided product tours, onboarding walkthroughs and feature spotlights — one engine, five frameworks.</strong>
</p>

<p align="center">
  A guided-tour library for <b>React</b>, <b>Vue</b>, <b>Solid</b>, <b>Angular</b> and <b>vanilla JavaScript</b>.<br>
  Accessible by default, SSR-verified, zero runtime dependencies, ESM-only, written in TypeScript.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@glowhop/react-tour"><img alt="npm version" src="https://img.shields.io/npm/v/@glowhop/react-tour?label=%40glowhop%2Freact-tour&color=4c35fd"></a>
  <a href="https://github.com/Glowhop/GlowTour.js/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Glowhop/GlowTour.js/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://bundlephobia.com/package/@glowhop/react-tour"><img alt="bundle size" src="https://img.shields.io/bundlephobia/minzip/@glowhop/react-tour?label=react%20adapter"></a>
  <a href="./LICENSE"><img alt="MIT license" src="https://img.shields.io/npm/l/@glowhop/react-tour?color=4c35fd"></a>
  <img alt="types included" src="https://img.shields.io/badge/types-included-4c35fd">
  <img alt="ESM only" src="https://img.shields.io/badge/module-ESM%20only-4c35fd">
</p>

<p align="center">
  <a href="https://glowtour.dev"><b>Website</b></a> ·
  <a href="https://glowtour.dev/docs/getting-started"><b>Documentation</b></a> ·
  <a href="https://glowtour.dev/examples"><b>Live examples</b></a> ·
  <a href="https://github.com/Glowhop/GlowTour.js/issues"><b>Issues</b></a>
</p>

<!-- <p align="center"><img src=".github/assets/demo.gif" alt="A three-step GlowTour.js walkthrough highlighting fields in a settings form" width="820"></p> -->

> **Status:** `dev`. The API is in use and documented, but breaking changes are still possible before 1.0.

---

## Why GlowTour.js

Most tour libraries are a single DOM script with framework wrappers bolted on, or a framework component you cannot reuse anywhere else. GlowTour.js splits the two: a framework-agnostic engine that owns workflow state, positioning and DOM behavior, and **native adapters** — real React components, real Vue components, real Angular standalone components — that render it.

|                              |                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Five native adapters**     | React, Vue 3, Solid, Angular 18, and native custom elements — not one wrapper reskinned five times.                      |
| **Accessible by default**    | `role="dialog"`, `aria-live` step description, focus trap, focus restoration, Escape and arrow-key shortcuts, everywhere. |
| **SSR-verified**             | `renderToString` + hydration coverage, plus real Next.js, Nuxt and SolidStart apps driven end to end with Playwright.    |
| **Zero runtime dependencies**| The core ships no dependencies and touches no browser global you did not hand it, which is what keeps SSR safe.          |
| **Themeable from CSS alone** | Every color, radius, spacing, size and transition is a `--glow-tour-*` token; the popover inherits your font.            |
| **Analytics-ready**          | One `onEvent` callback reports every start, step and exit — with the step id, its duration, and how the user left.       |
| **Steps that wait**          | `.do()`, `.wait()`, `.waitUntil()`, `.waitUntilElement()` and `.onTargetEvent()` sequence real work between steps.       |

Looking for an alternative to Driver.js, Intro.js, Shepherd.js or React Joyride that keeps first-class TypeScript types, server rendering and accessibility across more than one framework? That is the gap this fills.

## Install

```bash
# pick the adapter for your framework, plus the default theme
npm i @glowhop/react-tour @glowhop/styles-tour
```

<details>
<summary>Other frameworks</summary>

```bash
npm i @glowhop/vue-tour      @glowhop/styles-tour   # Vue 3
npm i @glowhop/solid-tour    @glowhop/styles-tour   # Solid
npm i @glowhop/angular-tour  @glowhop/styles-tour   # Angular 18
npm i @glowhop/vanilla-tour  @glowhop/styles-tour   # custom elements
```

The adapters depend on `@glowhop/core-tour`; you only install it directly to build your own adapter.

</details>

## Quick start

```tsx
import "@glowhop/styles-tour/default.css";
import { createGlowTour, DefaultTour } from "@glowhop/react-tour";

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({ id: "name", target: "#workspace-name", title: "Name it", content: "Anything you like." })
  .step({ id: "save", target: "#save", title: "Save", content: "That's the whole tour." })
  .build();

export function App() {
  return (
    <>
      <input id="workspace-name" />
      <button id="save">Save</button>
      <button type="button" onClick={() => void tour.run(workflow)}>Start tour</button>
      <DefaultTour tour={tour} />
    </>
  );
}
```

Import the stylesheet once. Nothing renders until an adapter connects a root and a popover — the core owns workflow state, navigation and DOM behavior, but no presentation.

The same workflow in [Vue](https://glowtour.dev/docs/getting-started#vue), [Solid](https://glowtour.dev/docs/getting-started#solid), [Angular](https://glowtour.dev/docs/getting-started#angular) and [vanilla JS](https://glowtour.dev/docs/getting-started#vanilla).

## Theming

The default theme declares every token at zero specificity, so a plain class on **any ancestor** of the tour re-skins it — no component has to be re-composed:

```css
.terminal-tour {
  font-family: ui-monospace, Menlo, monospace; /* the popover is `font: inherit` */

  --glow-tour-color-accent: #35f0a0;
  --glow-tour-color-surface: #071a12;
  --glow-tour-color-text: #d6ffe9;
  --glow-tour-radius: 2px;
  --glow-tour-popover-width: 320px;
}
```

<!-- <p align="center"><img src=".github/assets/theming.gif" alt="The same GlowTour.js popover re-skinned from CSS custom properties" width="720"></p> -->

Light and dark ship together; `data-glow-tour-theme="dark"` on a wrapper pins one. See the [Custom theme example](https://glowtour.dev/examples).

## Placement

`popover.placementTryOrder` walks top / bottom / left / right until one fits, then falls back to centering — the same collision logic drives the pointer.

<!-- <p align="center"><img src=".github/assets/placement.png" alt="GlowTour.js popover placement on all four sides of a target" width="720"></p> -->

## Packages

| Package                                                                                    | What it is                                                       |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| [`@glowhop/react-tour`](https://www.npmjs.com/package/@glowhop/react-tour)                   | React 18 / 19 adapter                                            |
| [`@glowhop/vue-tour`](https://www.npmjs.com/package/@glowhop/vue-tour)                       | Vue 3 adapter                                                    |
| [`@glowhop/solid-tour`](https://www.npmjs.com/package/@glowhop/solid-tour)                   | Solid adapter                                                    |
| [`@glowhop/angular-tour`](https://www.npmjs.com/package/@glowhop/angular-tour)               | Angular 18 adapter                                               |
| [`@glowhop/vanilla-tour`](https://www.npmjs.com/package/@glowhop/vanilla-tour)               | Native custom elements, no framework                             |
| [`@glowhop/styles-tour`](https://www.npmjs.com/package/@glowhop/styles-tour)                 | Default theme, light and dark                                    |
| [`@glowhop/core-tour`](https://www.npmjs.com/package/@glowhop/core-tour)                     | Workflow controller and DOM driver; never used standalone        |

Writing an adapter for another framework? [`@glowhop/core-tour/adapter`](https://github.com/Glowhop/GlowTour.js/blob/main/packages/core/README.md) is the entry point.

## Documentation

- [Getting started](https://glowtour.dev/docs/getting-started)
- [Examples gallery](https://glowtour.dev/examples) — every demo runs live, with its source
- [Accessibility](https://github.com/Glowhop/GlowTour.js/blob/main/docs/accessibility.md)
- [Framework versions and verified SSR facts](https://github.com/Glowhop/GlowTour.js/blob/main/docs/compatibility.md)
- [JSON configuration](https://github.com/Glowhop/GlowTour.js/blob/main/docs/json-config.md)

## Contributing

```bash
bun install --frozen-lockfile
bun run check && bun run typecheck && bun test && bun run build && bun run pack
```

`bun run docs` serves the website, `bun run playground` the scratch app. Changesets versions the public packages together; a published GitHub Release triggers the OIDC npm workflow ([release notes](https://github.com/Glowhop/GlowTour.js/blob/main/docs/release.md)).

Issues and pull requests are welcome — bug reports are most useful with the framework, adapter version, and a minimal reproduction.

## License

[MIT](./LICENSE) © Glowhop
