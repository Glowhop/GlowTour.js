# Step lifecycle hooks

Decision record for `beforeEnter` / `beforeLeave` and the removal of `resetPropsOnEnter`,
`beforeAdvance`, `beforePrevious`, and `beforeCancel` (released in 1.4.0).

## What shipped

- Step props persist across re-entries within a run. A new `run()` creates fresh step state, so
  nothing leaks from one run to the next.
- `beforeEnter(callback)` runs after the step's target is resolved and before `driver.show()`. The
  step is not committed yet, so the controller does not publish and the view has not subscribed to
  the step's props: whatever the hook sets is the first thing rendered. A step skipped by
  `missingTargetStrategy: "skip"` does not run it.
- `beforeLeave(callback)` runs at the start of a navigation away from the step: `advance()`,
  `previous()`, `goToStep()`, or advancing past the last step. It never runs on cancel.
- Both receive `StepHookContext<T> = Omit<StepContext<T>, "advance" | "cancel" | "previous">`.
- `StepContext` gains `initialProps` and `direction`. `direction` is captured when a context is
  created, not read live, so a long-running action never sees the direction of a later navigation.
  It is the direction of the navigation in progress: when the tour goes back from B to A, B's
  `beforeLeave` and A's `beforeEnter` both see `"previous"`, and A's actions keep that value. This
  is the same value `TourEvent.direction` reports for `step:leave` / `step:enter`.
- `direction` was kept as the name because `TourDirection`, `state.direction` and
  `TourEvent.direction` already use it. It does not tell a `goToStep()` jump from a button press, or
  a finish from a regular advance; that would be a separate field, as `TourEvent.source` is.
- JSON config: `enterAction` / `leaveAction`, functions only.

## Why

- `resetPropsOnEnter` was static and all or nothing. Keeping `data` while resetting the
  presentation, or deciding per visit, was not possible.
- Resetting manually from `.do()` was not a substitute: actions run after the step is shown, so the
  stale props were rendered first, and `initialProps` was not reachable from the context.
- `beforeAdvance` and `beforePrevious` were two hooks for one moment, leaving the step. One hook plus
  `direction` covers both.
- `beforeCancel` ran before `onCancel`, so its side effects happened even when `onCancel` called
  `abort()` and the tour stayed active. `onCancel` already receives the current step, and
  `context.signal` covers per-step cleanup.

## Known limits

- If `onFinish` calls `abort()`, the last step's `beforeLeave` has already run. This matches the
  previous `beforeAdvance` behavior.
- `context.signal` in a step action aborts as soon as a cancellation starts, even if `onCancel` then
  aborts it. This predates the change.

## Rejected directions

- **Exposing `resetPropsOnEnter` through `context.props`.** The flag would be read before the reset
  and restored by it: `false` would stick for good, `true` would apply once. A `props.set()` that
  forgets to spread `current` would silently turn the reset back on. It would also leak a policy
  flag into rendered props, state snapshots, and subscribers.
- **Making `data` never reset while the other props reset.** `content` and `data` are often written
  together; resetting one and not the other shows inconsistent state, and it adds a second rule.
- **Dropping the reset without a hook that runs before render.** The only manual reset point would
  have been `.do()`, after the step is shown.
- **Giving the hooks the full `StepContext`.** During a transition `advance()` and `previous()` are
  refused by `canNavigate` without any feedback, while `cancel()` would go through (`canCancel` does
  not look at the `transitioning` status) and the interrupted `enter()` would keep running under the
  same operation token.
- **Running `beforeLeave` on cancel.** It would need a third direction value or a `reason` field,
  and would overlap with `onCancel`, which can also prevent the cancellation.
- **A deprecation period.** The user base is still small; the breaking changes are documented in
  the changelog of the minor release instead.
