---
title: "Compatibility: framework versions and SSR"
description: Supported React, Vue, Angular and Solid versions, and the server rendering verified for each GlowTour.js adapter in Next.js, Nuxt, SolidStart and Angular SSR.
---

The versions listed are the current peer contracts and are not a promise of support for older major versions.

## Framework contracts

| Framework | Version | Adapter Package |
| --- | --- | --- |
| React | 18 and 19 (`^18.0.0 \|\| ^19.0.0`) | `@glowhop/react-tour` |
| Vue | 3.3+ (`^3.3.0`) | `@glowhop/vue-tour` |
| Solid | 1.8+ (`^1.8.0`) | `@glowhop/solid-tour` |
| Angular | 18+ (`^18.0.0`) | `@glowhop/angular-tour` |
| Vanilla/Browser | See [Browsers](#browsers) | `@glowhop/vanilla-tour` |

**Notes**:

- **React 18/19**: The range was verified by static analysis of adapter code. No version-gated APIs are used below these versions.
- **Vue/Solid**: The floor versions were verified by reading actual API usage in the adapters.
- **Angular 18+**: The floor is 18 rather than 17 because the adapter uses the stable `@if`/`@for` control-flow blocks, which only reached stable status in Angular 18.
- **Vanilla**: Relies on custom elements, without Shadow DOM. See [Browsers](#browsers).

## Browsers

**Tested in CI**: the current Chromium, Firefox, and WebKit engines shipped by Playwright run the accessibility-tree suite for every adapter. The SSR apps are tested in Chromium. Screen reader tests drive VoiceOver with WebKit and Chromium, and NVDA with Chromium and Firefox. Older browser versions are not tested.

**Required browser features**: every package uses them without a fallback.

- ES2022 syntax: the packages are not transpiled for older browsers
- `structuredClone`, used to copy each step's `data`
- `MutationObserver` and `requestAnimationFrame`
- the `inert` attribute, which keeps the page out of reach during a modal step
- custom elements, for `@glowhop/vanilla-tour` only

**Minimum versions**: none are guaranteed. GlowTour.js targets current evergreen browsers; a browser that supports every feature above is expected to work, but only the engines listed as tested are verified.

## Core module

`@glowhop/core-tour` is framework-agnostic and runs anywhere JavaScript does. It does not render UI or interact with the DOM until an adapter mounts it.

## SSR and hydration summary

| Adapter | SSR | Hydration | Verification |
| --- | --- | --- | --- |
| React | Yes | Yes | Package-level + Next.js production app |
| Vue | Yes | Yes | Package-level + Nuxt production app |
| Solid | Yes | Yes | Package-level + SolidStart production app |
| Angular | Yes | Yes | Angular SSR production app |
| Vanilla | Not applicable | Not applicable | DOM-free import only |

See the [SSR guide](/docs/guides/ssr/) for setup and hydration details per framework.

## Single instance contract

All adapters follow the same rule: one tour controller can be connected to one live root at a time. Separate instances and roots keep state, IDs, events, and DOM resources isolated. This is a safety mechanism, not a limitation - create multiple tour instances for multiple concurrent tours.

## Package distribution

- **Framework adapters** (`react`, `vue`, `solid`, `angular`, `vanilla`) are distributed as ESM-only packages. Each declares its framework as a peer dependency and keeps a development copy in its own workspace manifest.
- **Angular** is additionally shipped in Angular Package Format with partial compilation (`fesm2022`), so it links against your own Angular version at build time.
- **Core** (`core-tour`) is ESM-only and framework-agnostic.
- **Styles** (`styles-tour`) is CSS-only.
- **Type definitions** are included in each package.

All packages are published to npm under the `@glowhop` scope. The repository's `apps/playground` exercises every adapter but is private and is not a published compatibility target.
