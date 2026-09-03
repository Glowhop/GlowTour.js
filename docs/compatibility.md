# Framework compatibility

Glow Tour is in `dev`. The versions below are the current peer contracts; they are not a promise
of support for older major versions.

| Package | Framework contract | Adapter surface |
| --- | --- | --- |
| `@glowhop/react-tour` | React 18 and 19 (`^18.0.0 \|\| ^19.0.0`) | React components and Context-scoped instance |
| `@glowhop/vue-tour` | Vue 3.3.x and up (`^3.3.0`) | Vue components and provide/inject instance |
| `@glowhop/angular-tour` | Angular 18.x (`^18.0.0`) | Angular components and DI-scoped root |
| `@glowhop/solid-tour` | Solid 1.8.x and up (`^1.8.0`) | Solid components and Context-scoped instance |
| `@glowhop/vanilla-tour` | Modern browser DOM/custom-elements APIs | Native custom elements and root `tour` property |

The React 18/19 range and the Vue/Solid floors were verified against the framework APIs the
adapter code actually uses (no version-gated APIs below the stated floor), not by installing and
running against every listed version — treat them as a strong-confidence static analysis rather
than a matrix-tested guarantee. Angular's floor was kept at 18.0.0 rather than widened to 17
because the adapter templates rely on the `@if`/`@for` control-flow blocks, which only reached
stable (non-preview) status in Angular 18; supporting 17 would need real install-testing against
its dev-preview implementation first.

All adapters use `@glowhop/core-tour` for the controller and DOM behavior. An instance can be
connected to one live root at a time; separate instances and roots keep state, IDs, events, and
DOM resources isolated.

The framework packages declare their framework as peer dependencies and keep development copies in
their workspace manifests. Angular is distributed in Angular Package Format with partial
compilation. The styles package is CSS-only.

The private `apps/playground` exercises the adapters but is not a published compatibility package.

## SSR and hydration

React, Vue, and Solid have real automated coverage for both server rendering and hydration, at two
levels: package-level tests (`renderToString`/equivalent plus a hydration pass against the adapter
directly) and full real-app tests (`apps/ssr-react` on Next.js, `apps/ssr-vue` on Nuxt,
`apps/ssr-solid` on SolidStart — each does a production build, boots the built server, and drives
it with a headless browser via Playwright: fetches the raw SSR HTML, then loads it in-browser and
asserts zero hydration-mismatch/console errors and a working, interactive tour). Angular and
Vanilla remain unverified beyond DOM-free import, for the reasons below.

| Adapter | Verified SSR fact | Verified hydration fact |
| --- | --- | --- |
| React | Packaged `DefaultTour` renders via `react-dom/server`'s `renderToString` with no DOM globals present (package-level), and a real `next build` + `next start` app serves the same markup before any client JS runs (`apps/ssr-react`). | `react-dom/client`'s `hydrateRoot` hydrates that markup with zero console errors and an interactive tour (package-level); the real Next.js app hydrates cleanly and is interactive end to end (`apps/ssr-react`). |
| Vue | The packaged root renders via `@vue/server-renderer`'s `renderToString` (package-level), and a real Nuxt production build serves the same markup (`apps/ssr-vue`). | `createSSRApp(...).mount()` hydrates that markup with no hydration-mismatch warnings and an interactive tour (package-level); the real Nuxt app hydrates cleanly and is interactive end to end (`apps/ssr-vue`). |
| Solid | The packaged root renders via `solid-js/web`'s server build (package-level), and a real SolidStart production build serves the same markup (`apps/ssr-solid`). | The browser build's `hydrate()` attaches without throwing or duplicating nodes (package-level); the real SolidStart app hydrates cleanly and is interactive end to end (`apps/ssr-solid`) — see the hydration-key constraint below, which this app confirms does **not** affect real consumers. |
| Angular | Importing the package is DOM-free. | Not tested: `@angular/platform-server` isn't a dependency anywhere in the workspace, and adding it (plus the DOM shim it needs) is out of scope for a lightweight sanity test. No real-app Angular Universal test exists either. |
| Vanilla | Importing the package is DOM-free; custom-element mounting is browser-only. | Not applicable in the string-SSR sense — there's no component tree to hydrate, only custom elements upgrading once connected to a document that already contains their tags. |

**Solid hydration-key constraint (package-level test only, not a real-world risk):** the
package-level test in `packages/solid/src/solid.browser.ts` deliberately invokes components as
plain functions on both the server and client passes, which is sensitive to Solid's hydration key
numbering and causes a Solid-internal crash if the two passes don't match. This is an artificial
scenario built to document the constraint, not a bug: `apps/ssr-solid` proves that the packaged
`DefaultTour` (which already invokes every child consistently through `createComponent(...)`), used
the normal way in a real SolidStart app whose own JSX compiler invokes components consistently on
both sides, hydrates without any crash.

Each `apps/ssr-*` app has its own README explaining what it demonstrates and how to run its
Playwright suite (`bunx playwright test`, scoped to that app — these are excluded from the root
`bun test`/`bunx tsc` runs since they're full framework apps with their own build/type toolchain).
