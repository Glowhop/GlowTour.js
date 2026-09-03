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

React, Vue, and Solid have real automated coverage for both server rendering and hydration
(`renderToString`/equivalent plus a hydration pass, asserting no mismatch and that the hydrated
tour stays interactive). Angular and Vanilla remain unverified beyond DOM-free import, for the
reasons below.

| Adapter | Verified SSR fact | Verified hydration fact |
| --- | --- | --- |
| React | Packaged `DefaultTour` renders via `react-dom/server`'s `renderToString` with no DOM globals present. | `react-dom/client`'s `hydrateRoot` hydrates that markup with zero console errors, and the hydrated tour is interactive (workflow advances on trigger click). |
| Vue | The packaged root renders via `@vue/server-renderer`'s `renderToString`. | `createSSRApp(...).mount()` hydrates that markup with no hydration-mismatch warnings, and the hydrated tour is interactive. |
| Solid | The packaged root renders via `solid-js/web`'s server build (`renderToString` + `generateHydrationScript`). | The browser build's `hydrate()` attaches to that markup without throwing and without duplicating nodes. Not chained through a full `tour.run()`/click interaction check, unlike React/Vue — see the constraint below. |
| Angular | Importing the package is DOM-free. | Not tested: `@angular/platform-server` isn't a dependency anywhere in the workspace, and adding it (plus the DOM shim it needs) is out of scope for a lightweight sanity test. |
| Vanilla | Importing the package is DOM-free; custom-element mounting is browser-only. | Not applicable in the string-SSR sense — there's no component tree to hydrate, only custom elements upgrading once connected to a document that already contains their tags. |

**Solid hydration-key constraint:** Solid's hydration key numbering is sensitive to whether
components are invoked as plain functions or wrapped in `createComponent(...)`. Mixing the two
between the server render pass and the client hydrate pass causes a Solid-internal crash. Any real
SSR integration (e.g. a SolidStart app) must invoke the exported components identically on both
server and client.

Full app-level SSR/hydration testing through Next.js (React), Nuxt (Vue), or SolidStart (Solid) has
not been done — none of those frameworks are present in this workspace. The package-level tests
above validate the adapters' own SSR/hydration behavior in isolation; wiring a real framework app
is a separate, larger follow-up.
