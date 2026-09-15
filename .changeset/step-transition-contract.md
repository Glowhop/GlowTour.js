---
"@glowhop/core-tour": minor
---

Let step hooks stop a navigation, report skipped steps, and emit each transition's events once.

**Breaking changes**

- Going back over steps skipped for a missing target no longer cancels the tour when it runs past the first step: the tour stays on the step it was on.
- `tour:start` is emitted once the first step's `beforeEnter` has passed, instead of right after `onStart`. A start that this `beforeEnter` aborts emits no event at all.
- A navigation that skips several steps emits a single `step:leave` for the step being left, instead of repeating it for every skipped step.
- `StepHookContext` is now an interface with an `abort()` method.

**Added**

- `abort()` in `beforeEnter` and `beforeLeave` stops the navigation: the tour stays on its current step and emits nothing. When the first step's `beforeEnter` aborts, the tour goes back to `idle`, like an `onStart` abort. Called after the hook has settled, it has no effect.
- `step:skip` monitoring event, emitted for each step passed over by `missingTarget: { strategy: "skip" }`.

**Event order**

A navigation emits `step:skip` for each skipped step, then `step:leave` for the step being left, then `step:enter` for the step shown.
