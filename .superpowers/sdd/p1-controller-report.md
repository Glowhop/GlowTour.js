# P1 controller report

Status: base implementation committed as `f6764e9`; review corrections completed.

## Evidence

- Baseline red: focused controller test had 2 passes and 8 failures; typecheck had 5 errors. Root causes were invalid fake-element fixtures plus incomplete readonly/legacy migration.
- Requirement red cycles then exposed missing action execution, disabled-navigation enforcement, `goToStep` hooks, legacy aliases, deep readonly values, reverse target skipping, and unexpected resolver-abort handling.
- Green: focused controller suite has 20 passes; complete suite has 98 passes across 19 files.
- Prior implementation reference required by the brief: `412441b`.

## Architecture and interfaces

- `WorkflowDefinition<T>` contains frozen readonly plain data only.
- Internal `ActiveStep<T>` resolves workflow defaults once per run and owns target plus mutable observable props.
- `TourController<T>` owns lifecycle, snapshots, actions/hooks, transition exclusion, monotonic operation tokens, and abort controllers.
- Internal `TourViewDriver<T>` isolates `show`, `clear`, and `dispose`; the default no-op driver keeps core tests DOM-independent.
- `createGlowTour<T>()` is the sole new public instance factory.

## Verification

- `bun run check`: pass, 87 files.
- `bun run typecheck`: pass.
- `bun test`: pass, 98 tests / 0 failures.
- `bun run build`: pass, 7 packages.
- `bun run pack`: pass, 7 tarballs.
- `bun run test:tarballs`: pass.
- `bun run --cwd apps/playground build`: pass; pre-existing Angular chunk-size warning.

## Self-review

- Verified token/signal after awaited resolver, driver, action, hook, and lifecycle boundaries.
- Verified stale work cannot assign resolved targets or overwrite newer state.
- Verified state permissions and command behavior agree, including final-step advance.
- Verified definitions, supported nested option arrays, data records, and public snapshots are readonly/frozen.
- Verified no playground packaging or release workflow changes and no publication.

## Deferred compatibility debt

- Existing adapters still use `TourStore` and mutable `WorkflowStep`; a single marked conversion bridge turns readonly definitions into legacy steps.
- The next P1 task owns the concrete event-driven DOM view driver, cleanup, and positioning, then adapter migration removes the bridge and old exports.

## Concerns

- The no-op driver intentionally means event attachment and concrete DOM cleanup are not implemented in this task.
- Angular playground output retains its known large-chunk warning.

Commit: `f6764e9` (`refactor(core): add instance-first tour controller`).

## Review follow-up — 2026-08-20

Reviewed commit: `f6764e9`.

### Findings reproduced in RED

- Synchronous state subscribers could call `run`, `cancel`, or `dispose` during `finished`/`transitioning`, but the invalidated operation still invoked a callback or transition hook afterward.
- First-step `canPrevious` was always false although `previous()` cancels a cancellable workflow.
- Retry and action-delay timers retained their abort listener after normal resolution.
- Definition types and freezing lived in the builder while `ActiveStep` duplicated step-prop cloning/freezing.

The focused RED run contained seven failures: duplicate new-workflow finish, three stale-hook calls, first-step permission mismatch, and two missing timer-listener removals.

### Corrections

- Added operation checks immediately after status publications before any following callback, hook, action, target lookup, or mutation.
- Made both state and command navigation use the same first-step previous/cancel rule.
- Replaced duplicate timer helpers with one abortable timer that removes its listener on resolve and abort rejection.
- Added `packages/core/src/definition/` as the single owner of readonly definition types, step-prop clone/freeze helpers, drafts, and the definition factory. Builder and active runtime now consume those modules.

### Verification

- Focused controller: 27 passed, 0 failed.
- `bun run check`: pass, 91 files.
- `bun run typecheck`: pass.
- `bun test`: pass, 105 tests across 19 files.
- `bun run build`: pass, 7 packages.
- `bun run pack`: pass, 7 tarballs.
- `bun run test:tarballs`: pass with registry access. The sandboxed attempt first hit the known false `react@undefined` registry-resolution failure.
- `bun run --cwd apps/playground build`: pass with the existing Angular chunk-size warning.

Follow-up commit subject: `fix(core): guard reentrant tour transitions`.
