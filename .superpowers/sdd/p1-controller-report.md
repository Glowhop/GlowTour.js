# P1 controller report

Status: ready to commit

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

Commit: populated after commit as `refactor(core): add instance-first tour controller`.
