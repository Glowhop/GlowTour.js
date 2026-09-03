# SSR Vue verification harness

A minimal [Nuxt](https://nuxt.com) app that proves `@glowhop/vue-tour` server-renders and
hydrates correctly inside a real Nuxt application — not just via Vue's raw `renderToString`/
`createSSRApp().mount()` APIs (those are already covered by
`packages/vue/src/vue.test.ts` and `packages/vue/src/vue.browser.ts`).

The single page (`app/app.vue`) renders a target element, a trigger button, and the packaged
`GlowTourDefault` component wired to a two-step tour via `createGlowTour()`.

## What the test verifies

`tests/ssr-hydration.pw.ts` (Playwright) checks, against a production build:

1. **SSR**: fetching `/` directly (no JS execution) returns HTML that already contains the
   target/trigger markup and the tour's (inert, disabled) popover markup.
2. **Hydration**: loading the page in a real headless browser produces no hydration-mismatch
   warnings or console errors.
3. **Interactivity**: after hydration, clicking the trigger starts the tour and shows step one;
   clicking "Advance step" moves to step two; clicking it again finishes the tour and the
   popover becomes inert/hidden again.

## Running it locally

```sh
# from the repo root, once (installs all workspace deps)
bun install

cd apps/ssr-vue
bunx playwright install chromium   # one-time browser download
bun run build                      # nuxt build (production)
bunx playwright test               # boots `node .output/server/index.mjs` and runs the checks
```

`playwright.config.ts` starts the built server on port 4173 via its `webServer` option, so
`bunx playwright test` alone (after `bun run build`) is enough to reproduce the full
SSR + hydration + interactivity check.

Playwright is a devDependency scoped to this app only (not part of the root workspace's
shared tooling).
