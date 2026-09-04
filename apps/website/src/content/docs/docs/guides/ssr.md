---
title: SSR guide
description: Server-render Glow Tour with React, Vue, Solid, Angular, or Vanilla.
---

Glow Tour's adapters have varying levels of SSR support. React, Vue, and Solid have full verified coverage with real-world SSR apps. Angular and Vanilla are unverified but import safely without DOM globals.

## React SSR

React's adapter fully supports server-side rendering.

### Server rendering

The `DefaultTour` component renders as an inert container via `react-dom/server`:

```typescript
import { renderToString } from "react-dom/server";
import { DefaultTour, createGlowTour } from "@glowhop/react-tour";

const tour = createGlowTour();

const html = renderToString(
  <>
    <YourApp />
    <DefaultTour tour={tour} />
  </>
);

// html contains the tour's inert markup
```

### Hydration

On the client, `hydrateRoot` hydrates the server-rendered markup:

```typescript
import { hydrateRoot } from "react-dom/client";
import { DefaultTour, createGlowTour } from "@glowhop/react-tour";

const tour = createGlowTour();

hydrateRoot(
  document.getElementById("root")!,
  <>
    <YourApp />
    <DefaultTour tour={tour} />
  </>
);

// Tour is now interactive
```

**Real-world verified**: Apps using Next.js (tested in production builds with Playwright) work end-to-end with zero hydration errors.

## Vue SSR

Vue's adapter fully supports server-side rendering.

### Server rendering

```typescript
import { renderToString } from "@vue/server-renderer";
import { createApp } from "vue";
import { GlowTourDefault, createGlowTour } from "@glowhop/vue-tour";

const tour = createGlowTour();

const html = await renderToString(
  createApp({
    render() {
      return <YourApp />;
      <GlowTourDefault tour={tour} />;
    },
  })
);
```

### Hydration

On the client, use `createSSRApp` for hydration:

```typescript
import { createSSRApp } from "vue";
import { GlowTourDefault, createGlowTour } from "@glowhop/vue-tour";

const tour = createGlowTour();

createSSRApp({
  render() {
    return <>
      <YourApp />
      <GlowTourDefault :tour="tour" />
    </>;
  },
}).mount("#app");

// Tour is now interactive with no hydration warnings
```

**Real-world verified**: Nuxt production builds (tested with Playwright) work end-to-end with zero hydration mismatches.

## Solid SSR

Solid's adapter fully supports server-side rendering.

### Server rendering

```typescript
import { renderToString } from "solid-js/web";
import { DefaultTour, createGlowTour } from "@glowhop/solid-tour";

const tour = createGlowTour();

const html = await renderToString(() => (
  <>
    <YourApp />
    <DefaultTour tour={tour} />
  </>
));
```

### Hydration

On the client, use `hydrate`:

```typescript
import { hydrate } from "solid-js/web";
import { DefaultTour, createGlowTour } from "@glowhop/solid-tour";

const tour = createGlowTour();

hydrate(
  () => (
    <>
      <YourApp />
      <DefaultTour tour={tour} />
    </>
  ),
  document.getElementById("app")!
);

// Tour is now interactive
```

**Real-world verified**: SolidStart production builds (tested with Playwright) work end-to-end with zero hydration errors.

### Hydration key constraint

A package-level test deliberately invokes components as plain functions on both server and client, which is sensitive to Solid's hydration key numbering. This is an artificial test scenario, not a real-world risk: `DefaultTour` (which invokes children consistently via `createComponent()`) combined with normal SolidStart usage (where your JSX compiler invokes components consistently on both sides) hydrates without issues.

## Angular SSR

The adapter package is DOM-free to import and safe in Node.js.

**Hydration status**: Unverified. `@angular/platform-server` (required for SSR) is not a workspace dependency, and adding it with its required DOM shims is out of scope for a lightweight sanity test. No real-app Angular Universal test exists yet.

To test Angular SSR in your own project:
1. Set up Angular Universal following the official guide
2. Render the tour components in your server route
3. The adapters should work, but we don't have verified test coverage

## Vanilla SSR

Custom elements don't render on the server; they only upgrade once connected to a live DOM.

**Hydration status**: Not applicable in the string-render sense. The package is DOM-free to import; element registration and mounting happen only in the browser. If you're pre-rendering static HTML and appending the custom elements on the client, it works as expected.

## Summary table

| Framework | SSR | Hydration | Real-world verified |
| --- | --- | --- | --- |
| React | Yes | Yes | Next.js production |
| Vue | Yes | Yes | Nuxt production |
| Solid | Yes | Yes | SolidStart production |
| Angular | Unverified | Unverified | No test app |
| Vanilla | Not applicable | Not applicable | N/A |

## Verifying your setup

When you deploy an SSR app with Glow Tour:

1. Build and start your production server
2. Fetch the HTML and verify the tour markup is present (no errors in the build)
3. Load the page in a browser and verify no console errors appear
4. Interact with the tour and confirm it works correctly

If you find an issue, file it with your framework version and a minimal reproduction.
