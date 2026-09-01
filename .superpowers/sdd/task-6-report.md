# Task 6 — Stable positioning short-circuit

Commit: `0ba0cbd perf(core): skip stable position updates`

## RED

After temporarily removing the completed guard, the finalized instrumentation suite was run with:

```sh
bun test packages/core/src/dom/tour-view-driver.test.ts --test-name-pattern "stable frames|target rectangle changes|presentation props change|lost target after a stable"
```

Exit 1: 0 pass, 4 fail. Stable frames invoked overlay, popover, and pointer synchronization twice; rectangle and props changes performed a redundant second synchronization; and a target lost after a stable frame rendered before disconnect handling. This proves the tests exercise the short-circuit rather than only existing behavior.

## GREEN

Focused instrumentation:

```sh
bun test packages/core/src/dom/tour-view-driver.test.ts --test-name-pattern "stable frames|target rectangle changes|presentation props change|lost target after a stable"
```

Exit 0: 4 pass, 0 fail.

Focused driver suite:

```sh
bun test packages/core/src/dom/tour-view-driver.test.ts
```

Exit 0: 90 pass, 0 fail.

Core typecheck:

```sh
bunx tsc -p packages/core/tsconfig.json --noEmit
```

Exit 0.

Full Core suite:

```sh
bun test packages/core/src
```

Exit 0: 309 pass, 0 fail.

Browser suites:

```sh
bun run test:browser
```

Exit 0: Core (1), React (15), Solid (11), Vue (12), Angular (13), and Vanilla (15) passed.

Static and diff checks:

```sh
bun run check
git diff --check
```

Both exited 0. Biome checked 121 files with no fixes.

## Scope

- `updatePosition` snapshots the target rectangle exactly once after the Task 5 availability check.
- Equal rectangles with clean presentation return before overlay, popover, or pointer work; RAF scheduling remains continuous through the owner realm.
- Rectangle movement and presentation changes synchronize the visual layers once, then update the snapshot and clear presentation dirtiness only after synchronous synchronization completes.
- Instrumentation covers stable frames, movement, dynamic props, and target loss after a stable frame, including no post-loss frame rearm.

## Review

Independent review: approved with no findings. The reviewer verified target availability remains ahead of geometry reads, owner-realm RAF tracking continues through stable-frame skips, movement and props synchronize once, snapshot/dirtiness state commits only after synchronous synchronization, and target loss does not rearm RAF.
