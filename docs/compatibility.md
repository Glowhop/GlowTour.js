# Framework compatibility

Glow Tour is in `dev`. The versions below are the current peer contracts; they are not a promise
of support for older major versions.

| Package | Framework contract | Adapter surface |
| --- | --- | --- |
| `@glowhop/react-tour` | React 19 only | React components and Context-scoped instance |
| `@glowhop/vue-tour` | Vue 3.5.x (`^3.5.0`) | Vue components and provide/inject instance |
| `@glowhop/angular-tour` | Angular 18.2.x (`^18.2.0`) | Angular components and DI-scoped root |
| `@glowhop/solid-tour` | Solid 1.9.x (`^1.9.14`) | Solid components and Context-scoped instance |
| `@glowhop/vanilla-tour` | Modern browser DOM/custom-elements APIs | Native custom elements and root `tour` property |

All adapters use `@glowhop/core-tour` for the controller and DOM behavior. An instance can be
connected to one live root at a time; separate instances and roots keep state, IDs, events, and
DOM resources isolated.

The framework packages declare their framework as peer dependencies and keep development copies in
their workspace manifests. Angular is distributed in Angular Package Format with partial
compilation. The styles package is CSS-only.

The private `apps/playground` exercises the adapters but is not a published compatibility package.

## SSR and hydration

The following are the verified server-side facts. Hydration is unverified for every adapter; do not
rely on hydrating an active tour.

| Adapter | Verified SSR fact |
| --- | --- |
| React | Packaged `DefaultTour` supports static SSR, and importing the package is DOM-free. |
| Vue | The packaged root can be rendered in SSR; browser work starts when it mounts. |
| Solid | The packaged root can be rendered in SSR; browser work starts when it mounts. |
| Angular | Importing the package is DOM-free. |
| Vanilla | Importing the package is DOM-free; custom-element mounting is browser-only. |
