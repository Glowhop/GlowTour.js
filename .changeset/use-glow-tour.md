---
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
---

Run a tour from a component with `useGlowTour()`.

**Breaking changes**

- React, Vue, and Solid: `useTour()` becomes `useTourContext()`. It still reads the state of the enclosing `GlowTourRoot`.
- Angular: `injectGlowTour()` becomes `injectTourContext()`. The `injectGlowTour` name now belongs to the new API below and returns a different shape.

**Added**

- `useGlowTour(source?)` in React, Vue, and Solid, and `injectGlowTour(source?)` in Angular. They return the tour, its methods (`create`, `start`, `advance`, `previous`, `goTo`, `cancel`), and each state field in the framework's reactive form: values in React, refs in Vue, accessors in Solid, signals in Angular. Called with options, they create a tour; Vue, Solid, and Angular dispose it with the component. Called with an existing tour, they share it and never dispose it.
- `UseGlowTourResult` and `InjectGlowTourResult` types.
