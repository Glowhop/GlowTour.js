# Glow Tour — current contract

Glow Tour is a framework-agnostic guided-tour library for React 19, Vue, Angular, Solid,
and native custom elements. The project is in `dev`; breaking changes remain allowed until that
status changes.

## Published packages

The release contains exactly seven version-locked packages:

- `@glowhop/core-tour`
- `@glowhop/styles-tour`
- `@glowhop/react-tour`
- `@glowhop/vue-tour`
- `@glowhop/angular-tour`
- `@glowhop/solid-tour`
- `@glowhop/vanilla-tour`

`apps/playground` is a private validation application. It is built separately and is never packed,
versioned, grouped by Changesets, or published.

## Instance model

`createGlowTour<TContent>()` is the only public instance factory. There is no public singleton,
global store, or second workflow factory.

Each adapter exposes its specialized `createGlowTour()` and native components. One instance can be
connected to only one live root at a time. Separate instances and roots keep their state, IDs,
events, DOM resources, and dependency-injection context isolated.

```ts
const tour = createGlowTour<string>();

const workflow = tour
  .create("onboarding", { cancellable: true })
  .step({
    target: "#welcome",
    title: "Welcome",
    content: "This is the first step.",
  })
  .step({
    target: ({ signal }) => resolveTarget(signal),
    title: "Continue",
    content: "This target may resolve asynchronously.",
  })
  .build();

await tour.run(workflow);
```

## Controller

An instance exposes:

- `create(name, options?)`
- `run(workflow)`
- `advance()`
- `previous()`
- `goToStep(index)`
- `cancel()`
- `updateCurrentStep(update)`
- `dispose()`
- `state.get()` and `state.subscribe(listener)`

The public statuses are `idle`, `starting`, `transitioning`, `active`, `finished`, `cancelled`, and
`error`. State snapshots also expose `canAdvance`, `canPrevious`, `canCancel`, `isFirstStep`, and
`isLastStep`.

State and active-step callback facades are readonly. Dynamic step props are changed only through
`updateCurrentStep`. `dispose()` is terminal and idempotent.

## Builder

The canonical fluent methods are:

- `step(options)` and `build()`
- `delay(milliseconds)`
- `do(callback)`
- `on(event | events, callback)`
- `advance()` and `previous()`
- `beforeAdvance(callback)`, `beforePrevious(callback)`, and `beforeCancel(callback)`
- `waitFor(predicate, options?)` and `waitForElement(selector, options?)`
- `clickTarget()`, `focusTarget()`, and `concat(builder)`

`waitFor` and `waitForElement` poll immediately, then retry until success. Their defaults are a
3000 ms timeout and a 50 ms interval. Expiration is a terminal tour error: the view is cleaned and
the public Promise rejects. A newer run, cancellation, root release, or disposal invalidates the
pending wait.

Workflow definitions and step definitions are frozen readonly values. Mutable active-step state is
created separately for each run.

## Targets and behavior

A step target may be a selector, an `HTMLElement`, or a resolver receiving a
`TargetResolverContext` containing an `AbortSignal`. Resolvers may be synchronous or asynchronous.
Obsolete resolutions never update the current tour.

Missing targets use `behavior.missingTargetStrategy`:

- `error` (default): enter terminal `error` state;
- `wait`: retry until `targetTimeout`, 3000 ms by default;
- `skip`: continue in the current navigation direction.

Target geometry is event-driven by default through observers, scroll, resize, and coalesced animation
frames. `behavior.targetTracking: "continuous"` enables continuous tracking when required.

## DOM and accessibility

Each root owns a unique ID family, optionally prefixed with `idPrefix`. Explicit prefixes are
rejected when they collide outside their root.

The DOM driver:

- isolates nested and sibling roots;
- respects editable fields, IME composition, modifiers, and consumer-disabled controls;
- loops Tab and Shift+Tab inside modal tours;
- restores focus on cleanup;
- adds `aria-modal` only when target interaction is blocked;
- centralizes listeners, timers, observers, subscriptions, and animation frames for cleanup.

## Adapter injection

- React and Solid use Context.
- Vue uses provide/inject.
- Angular uses DI scoped by `GlowTourRoot`.
- Vanilla receives the instance through the root element's `tour` property.

Unmounting a root releases its lease and DOM resources. A non-disposed instance may later connect to
another root; a disposed instance may not.

## Release contract

All public packages build to ESM with declarations. Angular uses Angular Package Format with partial
compilation. Distribution manifests contain no `src`, raw TypeScript, or `workspace:*` references.

Changesets keeps the seven packages in one fixed version group. Stable GitHub Releases are the only
npm publication trigger. Publication uses npm trusted publishing/OIDC and never relies on a permanent
npm token. Local release commands and dry-runs must not publish.
