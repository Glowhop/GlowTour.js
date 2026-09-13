---
title: SSR guide
description: Server-render GlowTour.js with React, Vue, Solid, Angular, or Vanilla.
---

The GlowTour.js adapters have varying levels of SSR support. React, Vue, Solid, and Angular have verified coverage with real-world SSR apps. Vanilla custom elements only upgrade in the browser, but the package imports safely without DOM globals.

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

### With Next.js (App Router)

Import the theme once in the root layout:

```tsx title="app/layout.tsx"
import type { ReactNode } from "react";
import "@glowhop/styles-tour/default.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

The tour reacts to clicks, so it lives in a client component. Client components are still rendered on the server first, then hydrated:

```tsx title="app/onboarding.tsx"
"use client";

import { createGlowTour, DefaultTour } from "@glowhop/react-tour";
import { useState } from "react";

export function Onboarding() {
  // Lazy state creates the tour once per mounted component, never once per render.
  const [tour] = useState(() => createGlowTour());
  const [workflow] = useState(() =>
    tour
      .create("welcome")
      .step({ id: "search", target: "#search", title: "Search", content: "Find anything here." })
      .build(),
  );

  return (
    <>
      <button type="button" onClick={() => void tour.run(workflow)}>
        Start tour
      </button>
      <DefaultTour tour={tour} />
    </>
  );
}
```

The page itself can stay a server component:

```tsx title="app/page.tsx"
import { Onboarding } from "./onboarding";

export default function Page() {
  return (
    <main>
      <input id="search" type="search" placeholder="Search" />
      <Onboarding />
    </main>
  );
}
```

## Vue SSR

Vue's adapter fully supports server-side rendering.

### Server rendering

```typescript
import { renderToString } from "@vue/server-renderer";
import { createApp, h } from "vue";
import { GlowTourDefault, createGlowTour } from "@glowhop/vue-tour";

const tour = createGlowTour();

const html = await renderToString(
  createApp({
    render: () => [h(YourApp), h(GlowTourDefault, { tour })],
  })
);
```

### Hydration

On the client, use `createSSRApp` for hydration:

```typescript
import { createSSRApp, h } from "vue";
import { GlowTourDefault, createGlowTour } from "@glowhop/vue-tour";

const tour = createGlowTour();

createSSRApp({
  render: () => [h(YourApp), h(GlowTourDefault, { tour })],
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

### With SolidStart

Import the theme once in the app root:

```tsx title="src/app.tsx"
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "@glowhop/styles-tour/default.css";

export default function App() {
  return (
    <Router root={(props) => <Suspense>{props.children}</Suspense>}>
      <FileRoutes />
    </Router>
  );
}
```

Then render `DefaultTour` in any route. Solid components run once, so creating the tour inside the component gives each request its own instance on the server:

```tsx title="src/routes/index.tsx"
import { createGlowTour, DefaultTour } from "@glowhop/solid-tour";

export default function Home() {
  const tour = createGlowTour();
  const workflow = tour
    .create("welcome")
    .step({ id: "search", target: "#search", title: "Search", content: "Find anything here." })
    .build();

  return (
    <main>
      <input id="search" type="search" placeholder="Search" />
      <button type="button" onClick={() => void tour.run(workflow)}>
        Start tour
      </button>
      <DefaultTour tour={tour} />
    </main>
  );
}
```

### Hydration key constraint

A package-level test deliberately invokes components as plain functions on both server and client, which is sensitive to Solid's hydration key numbering. This is an artificial test scenario, not a real-world risk: `DefaultTour` (which invokes children consistently via `createComponent()`) combined with normal SolidStart usage (where your JSX compiler invokes components consistently on both sides) hydrates without issues.

## Angular SSR

Angular's adapter works with the official Angular SSR stack (`@angular/ssr`) and non-destructive hydration.

### Setup

Start from an SSR app: `ng new --ssr` creates one, and `ng add @angular/ssr` adds the server files to an existing app. Make sure client hydration is enabled in your application config:

```typescript title="src/app/app.config.ts"
import type { ApplicationConfig } from "@angular/core";
import { provideClientHydration } from "@angular/platform-browser";

export const appConfig: ApplicationConfig = {
  providers: [provideClientHydration()],
};
```

Add the theme to the build styles in `angular.json`:

```json title="angular.json (projects.<app>.architect.build.options)"
{
  "styles": ["@glowhop/styles-tour/default.css"]
}
```

### Example component

The tour components need nothing SSR-specific:

```typescript title="src/app/app.component.ts"
import { Component } from "@angular/core";
import { createGlowTour, GlowTourDefault } from "@glowhop/angular-tour";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [GlowTourDefault],
  template: `
    <input id="search" type="search" placeholder="Search" />
    <button type="button" (click)="start()">Start tour</button>
    <glow-tour-default [tour]="tour" />
  `,
})
export class AppComponent {
  readonly tour = createGlowTour();
  readonly workflow = this.tour
    .create("welcome")
    .step({ id: "search", target: "#search", title: "Search", content: "Find anything here." })
    .build();

  start(): void {
    void this.tour.run(this.workflow);
  }
}
```

`GlowTourDefault` renders its inert markup on the server, and the client reuses that DOM instead of re-rendering it.

**Real-world verified**: Angular 18 production builds (`ng build` served through `CommonEngine`, tested with Playwright) render the tour markup on the server and hydrate with no NG05xx hydration errors.

## Vanilla SSR

Custom elements don't render on the server; they only upgrade once connected to a live DOM.

**Hydration status**: Not applicable in the string-render sense. The package is DOM-free to import; element registration and mounting happen only in the browser. If you're pre-rendering static HTML and appending the custom elements on the client, it works as expected.

## Summary table

| Framework | SSR | Hydration | Real-world verified |
| --- | --- | --- | --- |
| React | Yes | Yes | Next.js production |
| Vue | Yes | Yes | Nuxt production |
| Solid | Yes | Yes | SolidStart production |
| Angular | Yes | Yes | Angular SSR production |
| Vanilla | Not applicable | Not applicable | N/A |

## Verifying your setup

When you deploy an SSR app with GlowTour.js:

1. Build and start your production server
2. Fetch the HTML and verify the tour markup is present (no errors in the build)
3. Load the page in a browser and verify no console errors appear
4. Interact with the tour and confirm it works correctly

If you find an issue, file it with your framework version and a minimal reproduction.
