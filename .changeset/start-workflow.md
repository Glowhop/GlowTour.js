---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": minor
---

Rename `tour.run(workflow)` to `tour.start(workflow)`.

**Breaking changes**

- All adapters: `tour.run(workflow, options?)` becomes `tour.start(workflow, options?)`, with the same arguments and the same promise. The value returned by `useGlowTour()` and `injectGlowTour()` exposes `start` instead of `run`.
