# Task 4 — Presentation-only button disabling

## RED

Command:

```sh
bun test packages/core/src/runtime/tour-controller.test.ts
```

Result: exit 1; 63 passing, 2 failing. The new programmatic-navigation case failed as expected before the controller change:

```text
allows public navigation when matching popover controls are disabled
Expected: { canAdvance: true, canPrevious: false }
Actual:   { canAdvance: false, canPrevious: false }
```

This showed that `disableAdvanceButton` was incorrectly affecting public programmatic capability. The existing action-context case already passed because action contexts directly reached the internal navigation method; Task 4 routes both public and action-context navigation through the same guarded transition entry.

## GREEN

Focused controller and driver checks:

```sh
bun test packages/core/src/runtime/tour-controller.test.ts packages/core/src/dom/tour-view-driver.test.ts
```

Result: exit 0; 149 passing, 0 failing.

The controller coverage includes public `advance`, `previous`, and `goToStep`; `StepContext.advance` and `StepContext.previous`; capability snapshots before, during, and after staged transitions; first-step previous bounds; and disabled-popover state. Existing DOM driver coverage continues to prove disabled keyboard and click controls do not navigate.

Typecheck:

```sh
bunx tsc -p packages/core/tsconfig.json --noEmit
```

Result: exit 0.

Full Core suite:

```sh
bun test packages/core/src
```

Result: exit 0; 294 passing, 0 failing.

Shared DOM/browser suites:

```sh
bun run test:browser
```

Result: exit 0; Core (1), React (15), Solid (11), Vue (12), Angular (13), and Vanilla (15) browser tests all passed.

Static and diff checks:

```sh
bunx biome check packages/core/src/runtime/tour-controller.ts packages/core/src/runtime/tour-controller.test.ts packages/core/src/types/index.ts
git diff --check
```

Result: both exit 0.
