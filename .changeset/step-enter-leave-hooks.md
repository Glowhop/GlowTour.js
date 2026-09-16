---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": minor
---

Replace the step transition hooks with `beforeEnter` / `beforeLeave`, and stop resetting step props automatically.

**Breaking changes**

- Step props are no longer reset when the tour enters a step. A value set with `context.props.set()` is kept when the tour comes back to that step, until the workflow runs again. `resetPropsOnEnter` is removed from `StepParameters` and from the JSON `StepConfig`.
- `beforeAdvance()`, `beforePrevious()`, and `beforeCancel()` are removed from the step builder, along with the `BeforeActionStepContext` and `StepTransitionAction` types.
- JSON config: `advanceAction`, `previousAction`, `cancelAction`, and `resetPropsOnEnter` are no longer accepted and are reported as unknown step keys. `TransitionActionRef` is replaced by `StepHookActionRef` in `@glowhop/core-tour/config` and in every adapter's `/config` entry point.

**Added**

- `.beforeEnter(callback)` runs each time a step is entered, after its target is resolved and before the step is shown, so the props it sets are the first ones rendered. It does not run for a step skipped by `missingTarget: { strategy: "skip" }`.
- `.beforeLeave(callback)` runs before `advance()`, `previous()`, `goTo()`, or finishing the tour. It never runs on cancel.
- Both hooks receive a `StepHookContext` (`props`, `initialProps`, `target`, `signal`, `direction`) without navigation methods. JSON config: `beforeEnter` / `beforeLeave`.
- `context.props.update(patch)` merges a partial change into the step props, instead of spreading every level by hand: `props.update({ popover: { controls: { advance: "visible" } } })`. `data` is merged key by key, `overlay` / `popover` / `indicator` are merged like step options over workflow defaults, and arrays are replaced. It also accepts a function of the current props.
- `StepContext` (actions and target event handlers) now exposes `initialProps` and `direction`, the direction of the navigation that entered the step.

**Migration**

- To keep resetting props on every visit:

  ```ts
  .beforeEnter(({ props, initialProps }) => props.set(initialProps))
  ```

- Remove `resetPropsOnEnter: false`: not resetting is now the default.
- Replace `beforeAdvance(fn)` with `beforeLeave((context) => { if (context.direction === "advance") return fn(context); })`, and `beforePrevious(fn)` the same way with `"previous"`. The hook context no longer spreads the step props: read them with `context.props.get()`.
- Move `beforeCancel(fn)` to the workflow `onCancel` option, which receives a snapshot of the current step (`context.step`), or clean up from a step action with `context.signal`.
- JSON config: replace `advanceAction` / `previousAction` with `beforeLeave` (branch on `direction`) and `cancelAction` with the workflow `onCancel`.
