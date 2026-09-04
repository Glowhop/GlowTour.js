---
title: Compatibility
description: Framework versions and SSR support verified for each adapter.
---

Glow Tour is in `dev`. The versions listed are the current peer contracts and are not a promise of support for older major versions.

## Framework contracts

| Framework | Version | Adapter Package |
| --- | --- | --- |
| React | 18 and 19 (`^18.0.0 \|\| ^19.0.0`) | `@glowhop/react-tour` |
| Vue | 3.3+ (`^3.3.0`) | `@glowhop/vue-tour` |
| Solid | 1.8+ (`^1.8.0`) | `@glowhop/solid-tour` |
| Angular | 18+ (`^18.0.0`) | `@glowhop/angular-tour` |
| Vanilla/Browser | Modern DOM APIs | `@glowhop/vanilla-tour` |

**Notes**:

- **React 18/19**: The range was verified by static analysis of adapter code. No version-gated APIs are used below these versions.
- **Vue/Solid**: The floor versions were verified by reading actual API usage in the adapters.
- **Angular 18+**: The floor is 18 rather than 17 because the adapter uses the stable `@if`/`@for` control-flow blocks, which only reached stable status in Angular 18.
- **Vanilla**: Requires modern browser support for custom elements and Shadow DOM (Chrome 77+, Firefox 63+, Safari 13+, Edge 79+).

## Core module

`@glowhop/core-tour` is framework-agnostic and runs anywhere JavaScript does. It does not render UI or interact with the DOM until an adapter mounts it.

## SSR and hydration summary

| Adapter | SSR | Hydration | Verification |
| --- | --- | --- | --- |
| React | Yes | Yes | Package-level + Next.js production app |
| Vue | Yes | Yes | Package-level + Nuxt production app |
| Solid | Yes | Yes | Package-level + SolidStart production app |
| Angular | Unverified | Unverified | DOM-free import only |
| Vanilla | Not applicable | Not applicable | DOM-free import only |

## Detailed SSR status

### React

**Server rendering**: `DefaultTour` renders via `react-dom/server`'s `renderToString` with no DOM globals present.

**Hydration**: `react-dom/client`'s `hydrateRoot` hydrates the server-rendered markup with zero console errors and an interactive tour.

**Real-world verified**: A production Next.js app serves the same markup, loads in the browser, and runs end-to-end with Playwright-driven tests — zero hydration errors.

### Vue

**Server rendering**: The packaged root renders via `@vue/server-renderer`'s `renderToString`.

**Hydration**: `createSSRApp(...).mount()` hydrates the markup with no hydration-mismatch warnings and an interactive tour.

**Real-world verified**: A production Nuxt app hydrates cleanly and is interactive end-to-end.

### Solid

**Server rendering**: The packaged root renders via `solid-js/web`'s server build.

**Hydration**: The browser build's `hydrate()` attaches without throwing or duplicating nodes.

**Real-world verified**: A production SolidStart app hydrates cleanly and is interactive end-to-end.

**Hydration-key constraint**: A package-level test deliberately invokes components as plain functions on both server and client, making it sensitive to Solid's internal hydration key numbering. This is an artificial scenario to document the constraint, not a real-world risk: `DefaultTour` (which invokes every child consistently via `createComponent(...)`) used in a normal SolidStart app (whose JSX compiler invokes components consistently on both sides) hydrates without issues. The production SolidStart app confirms this.

### Angular

**Server rendering**: DOM-free import; `@angular/platform-server` is not a workspace dependency.

**Hydration**: Not tested. Adding `@angular/platform-server` plus the required DOM shims is out of scope for a lightweight sanity test. No real-app Angular Universal test exists.

**Recommendation**: If you use Angular SSR, the adapters should work (they're DOM-free), but we have no verified test coverage. If you encounter issues, file a report with your Angular and adapter versions.

### Vanilla

**Server rendering**: Not applicable. Custom elements don't render on the server; they only upgrade once connected to a live DOM.

**Hydration**: Not applicable in the string-render sense. The package is DOM-free to import; registration and mounting happen only in the browser. If you pre-render static HTML and append custom elements on the client, it works as expected.

## Single instance contract

All adapters follow the same rule: one tour controller can be connected to one live root at a time. Separate instances and roots keep state, IDs, events, and DOM resources isolated. This is a safety mechanism, not a limitation — create multiple tour instances for multiple concurrent tours.

## Package distribution

- **Framework adapters** (`react`, `vue`, `solid`, `angular`, `vanilla`) are distributed as ESM-only packages.
- **Core** (`core-tour`) is ESM-only and framework-agnostic.
- **Styles** (`styles-tour`) is CSS-only.
- **Type definitions** are included in each package.

All packages are published to npm under the `@glowhop` scope.
