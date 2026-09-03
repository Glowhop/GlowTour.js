# apps/ssr-react

A minimal Next.js (App Router) app that verifies `@glowhop/react-tour` works
correctly when server-rendered and hydrated by a real framework, not just via
React's raw `react-dom/server` / `react-dom/client` APIs (those are already
covered by `packages/react/src/react.test.ts` and `react.browser.ts`).

This is a verification harness, not a product: one page, one tour, no extra
UI.

## What it demonstrates

- `app/page.tsx` is a client component (`"use client"`) that builds a
  two-step tour with `createGlowTour()` and renders the packaged
  `DefaultTour` component, wired to a trigger button and two target
  elements.
- `next build && next start` runs the app in production mode, the same way a
  real deployment would.
- `tests/ssr-hydration.pw.ts` (Playwright) proves three things end-to-end:
  1. **SSR**: fetching the page HTML directly (no JS execution) already
     contains the trigger, both step targets, and the `DefaultTour` markup
     (`data-glow-tour-root`, `data-glow-tour-popover`).
  2. **Clean hydration**: loading the page in a real headless browser
     produces no hydration-related console or page errors.
  3. **Interactivity after hydration**: clicking the trigger starts the
     tour on step one, clicking "advance" moves it to step two, and
     clicking "advance" again finishes it.

## Running it locally

From the repo root, packages must already be built (`bun run build`) since
`@glowhop/react-tour` and `@glowhop/styles-tour` are consumed from their
`dist/` output via `workspace:*`.

```sh
# once: install the Playwright browser binary
bun run --cwd apps/ssr-react test:install

# build the Next.js app in production mode and run the Playwright suite
# against `next start` (playwright.config.ts starts/stops the server)
bun run --cwd apps/ssr-react test
```

`bun run --cwd apps/ssr-react dev` starts the app for manual poking at
http://localhost:3000.
