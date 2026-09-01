# Task 5 — Active target disconnection recovery

## RED

`bun test packages/core/src/runtime/tour-controller.test.ts packages/core/src/dom/tour-view-driver.test.ts`

Exit 1. The six new controller tests failed with `TypeError: driver.commands.targetDisconnected is not a function`; the new driver test failed because no notification occurred. Existing tests passed (149 pass, 7 fail).

`bun test packages/core/src/runtime/tour-controller.test.ts --test-name-pattern "normal cancellation boundary"`

Exit 1. The new backward-skip boundary regression failed with `actual: "error", expected: "cancelled"`, proving recovery had cleared the target required by the normal cancel action context.

## GREEN

`bun test packages/core/src/runtime/tour-controller.test.ts packages/core/src/dom/tour-view-driver.test.ts`

Exit 0: 160 pass, 0 fail.

`bun test packages/core/src/runtime/tour-controller.test.ts --test-name-pattern "normal cancellation boundary"`

Exit 0: 1 pass, 0 fail.

`bunx tsc -p packages/core/tsconfig.json --noEmit`

Exit 0.

`bun test packages/core/src`

Exit 0: 305 pass, 0 fail.

`bun run test:browser`

Exit 0: Core (1), React (15), Solid (11), Vue (12), Angular (13), and Vanilla (15) browser tests passed.

`bun run check`

Exit 0: Biome checked 121 files with no fixes.

`git diff --check`

Exit 0.

## Scope

- Added the internal `targetDisconnected(target)` driver-to-controller command.
- The DOM driver detects detached or root-document-mismatched active targets before geometry reads, stops its generation/resources, and notifies once.
- The controller starts a fresh abortable recovery operation, preserves current dynamic props, reuses missing-target handling, and does not rerun step actions on same-step recovery.
- Tests cover replacement wait, direct-element reconnection, forward and backward skip boundaries (including the non-cancellable initial-traversal boundary), error, timeout, stale/repeated notifications, a superseding run, preserved props, action-once behavior, root-document mismatch detection, and no post-disconnect geometry read/write or RAF rearm.
