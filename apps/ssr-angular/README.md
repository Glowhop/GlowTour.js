# apps/ssr-angular

A minimal Angular 18 app (Angular CLI application builder, `@angular/ssr`) that verifies
`@glowhop/angular-tour` works when server-rendered and hydrated by the official Angular SSR
stack, with non-destructive hydration (`provideClientHydration()`) enabled.

This is a verification harness, not a product: one page, one tour, no extra UI.

## What it demonstrates

- `src/app/app.component.ts` builds a two-step tour with `createGlowTour()` and renders the
  packaged `GlowTourDefault` component next to a trigger button and a target element.
- `server.ts` renders every page request with `CommonEngine`, the same way a generated
  `ng new --ssr` app does.
- `tests/ssr-hydration.pw.ts` (Playwright) checks, against the production build:
  1. **SSR**: the raw HTML (no JS executed) already contains the trigger, the target, the tour
     popover markup and Angular's `ngh` hydration annotations.
  2. **Clean hydration**: no console errors or warnings (hydration mismatches are reported as
     NG05xx errors) and no uncaught page errors.
  3. **Interactivity after hydration**: the trigger starts the tour, "advance" moves to step
     two, and advancing again finishes it.

## Running it locally

From the repo root, packages must already be built (`bun run build`) since
`@glowhop/angular-tour` and `@glowhop/styles-tour` are consumed from their `dist/` output.

```sh
cd apps/ssr-angular
bun run playwright install chromium   # one-time browser download
bun run test                          # ng build, then Playwright against node dist/server/server.mjs
```

`bun run dev` starts the Angular dev server for manual poking at http://localhost:4200.
