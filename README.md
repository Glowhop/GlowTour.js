# Glow Tour

Glow Tour is a guided-tour library with one shared core and native adapters for React, Vue,
Angular, Solid, and the browser. The project is currently in `dev`; breaking changes remain
allowed until that status changes.

## Packages

The public distribution contains exactly seven packages:

- `@glowhop/core-tour`
- `@glowhop/styles-tour`
- `@glowhop/react-tour`
- `@glowhop/vue-tour`
- `@glowhop/angular-tour`
- `@glowhop/solid-tour`
- `@glowhop/vanilla-tour`

`apps/playground` is a private validation application. It is built separately and is never
packed, versioned, included in the fixed Changesets group, or published.

## Usage

Each adapter exposes its own `createGlowTour()` and native root/components. The factory is the
only public way to create an instance.

Render the root once, then call the start function from an event after that root is mounted:

```tsx
import { createGlowTour, GlowTour } from "@glowhop/react-tour";

const tour = createGlowTour();

export function TourLayer() {
  return (
    <GlowTour.Root tour={tour}>
      <GlowTour.Overlay />
      <GlowTour.Pointer />
      <GlowTour.Popover>
        <GlowTour.Header />
        <GlowTour.Content />
        <GlowTour.Footer>
          <GlowTour.BackTrigger />
          <GlowTour.NextTrigger />
          <GlowTour.CancelTrigger />
        </GlowTour.Footer>
      </GlowTour.Popover>
    </GlowTour.Root>
  );
}

export async function startOnboarding() {
  const workflow = tour
    .create("onboarding", { cancellable: true })
    .step({ target: "#welcome", title: "Welcome", content: "This is the first step." })
    .step({ target: "#continue", title: "Continue", content: "The tour is instance-scoped." })
    .build();

  await tour.run(workflow);
}
```

The controller provides `run`, `advance`, `previous`, `goToStep`, `cancel`,
`updateCurrentStep`, `dispose`, and readonly `state.get()` / `state.subscribe()`. Builder waits
default to a 3000 ms timeout and a 50 ms interval. See the
[current contract](https://github.com/Glowhop/glow-tour/blob/main/project.md) for details.

## Compatibility

| Adapter | Supported contract in `dev` |
| --- | --- |
| React | React 19 only |
| Vue | Vue 3.5.x (`^3.5.0`) |
| Angular | Angular 18.2.x (`^18.2.0`); APF partial compilation |
| Solid | Solid 1.9.x (`^1.9.14`) |
| Vanilla | Modern browsers with custom elements and DOM APIs |

See the [compatibility guide](https://github.com/Glowhop/glow-tour/blob/main/docs/compatibility.md)
for adapter notes.

## Development

```bash
bun install --frozen-lockfile
bun run check
bun run typecheck
bun test
bun run build
bun run pack
```

The playground is validated separately with `bun run --cwd apps/playground build`.

## Releases

Changesets keeps all seven public packages in one fixed version group. A stable GitHub Release is
the only publication trigger. The workflow uses npm trusted publishing/OIDC and publishes in the
order documented in the
[release guide](https://github.com/Glowhop/glow-tour/blob/main/docs/release.md). Local release
commands are dry-runs and must not publish to npm.
