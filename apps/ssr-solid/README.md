# apps/ssr-solid

A minimal SolidStart (v2) app used to verify that `@glowhop/solid-tour`'s packaged
`DefaultTour` component is safe to use in a real server-rendered + hydrated Solid app.

## Why this exists

`packages/solid`'s own unit tests (`packages/solid/src/solid.browser.ts`) documented a
constraint: Solid's hydration key numbering is sensitive to whether components are
invoked as plain functions vs. wrapped in `createComponent(...)`, and mixing the two
between server render and client hydrate can crash Solid with
`"template is not a function"`. Those tests reproduce that failure mode deliberately
by calling components inconsistently.

A real SolidStart app is the scenario that tells us whether this is an actual risk for
consumers: SolidStart's JSX compiler invokes components consistently (always through
`createComponent`) on both the server and the client, and the packaged `DefaultTour`
(`packages/solid/src/components/default-tour.tsx`) is itself implemented with
`createComponent` throughout. This app is the end-to-end check that those two facts
add up to a safe real-world experience — no manual workaround needed by consumers.

## What it does

- Renders a heading (`#tour-target`) and a button (`#tour-trigger`).
- Wires up a 2-step tour via `createGlowTour()` and renders `<DefaultTour tour={tour} />`.
- Clicking the trigger starts the tour; clicking "Advance" moves to the next step.

## Running the verification test locally

```bash
bun install
cd apps/ssr-solid
bunx playwright install chromium   # one-time browser download
bunx playwright test
```

The Playwright config's `webServer` builds the app in production mode
(`vite build`) and serves it (`vite preview`) before running the tests, so this
exercises the real production SSR + hydration path, not the dev server.

The test suite (`tests/ssr-hydration.pw.ts`) checks:

1. The raw SSR HTML response (fetched directly, before any client JS runs) contains
   the target/trigger markup and the packaged tour root/popover markup.
2. Loading the page in a real headless browser hydrates without any console errors
   or uncaught page errors (this is where the hydration-key mismatch described above
   would surface, if it occurred).
3. The tour is interactive after hydration: clicking the trigger opens the tour
   popover, and clicking "Advance" moves to the next step.

## Result

As of this writing, both tests pass: SSR output is correct and hydration completes
with no console/page errors and no "template is not a function" crash. The packaged
`DefaultTour` component is safe to use as-is in a real SolidStart app.
