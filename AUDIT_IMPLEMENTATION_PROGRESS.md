# Audit implementation progress

Last updated: 2026-08-22

## Current position

- Branch: `codex/audit-p3-polish`
- Parent branch: `codex/audit-p2-contracts` at `8ae482c`
- Last completed milestone: P3 is complete, independently approved, and recorded by the current completion commit.
- Current task: audit implementation complete; the user explicitly authorized the verified four-branch push to the configured GitHub `origin`.
- Next action: outside repository implementation, configure npm trusted publishing for the seven packages before the first stable GitHub Release.

## Completed

- P2 builder RED: the canonical `WorkflowBuilder` contract test fails because the source still exports only the old `Builder` and its former method names. This is the expected starting failure before the P2 builder migration.
- P2 builder/wait GREEN: renamed the fluent contract to `WorkflowBuilder`/`WorkflowStepBuilder` with `build`, `delay`, `do`, `on`, `advance`, `previous`, and `before*`; removed the former aliases; migrated Core, every adapter suite, and all five private playground entries.
- P2 waits now compile to readonly discriminated instructions. The controller evaluates immediately, retries with abortable timers, defaults to 3000 ms/50 ms, rejects invalid timing options, and turns expiration or predicate errors into the existing terminal `error` cleanup path.
- P2 readonly callback state: actions, transition hooks, and event handlers receive a frozen `ReadonlyStepState` facade with only `get` and `subscribe`; the mutable observable remains internal to `ActiveStep` and DOM synchronization.
- P2 focused verification: builder/controller tests passed 45/45 after an expected scheduling-sensitive RED test was corrected to wait for actual predicate entry. Full unit tests passed 174/174 across 21 files; browser tests passed React 12/12, Solid 8/8, Vue 10/10, Angular 10/10, and Vanilla 16/16.
- P2 static/distribution verification: Biome checked 100 files after formatting four mechanical migration diffs; typecheck passed; build/pack produced exactly 7 public packages/tarballs; Core ESM still exposes only `createGlowTour`; removed builder/type aliases are absent from public declarations; external tarball smoke passed for all 7 packages; the private playground built separately with only its existing Angular chunk warning.
- P2 builder/wait review requested two corrections: bound slow or never-resolving async predicates by both the remaining timeout and the operation abort signal, and refresh stale crash-recovery instructions. The predicate evaluator now owns a cleaned timer/abort race; regression tests cover slow success, never resolution, and cancellation during a pending async predicate.
- P2 builder/wait re-review approved both corrections with no remaining finding. Final unit verification passed 175/175; browser suites remained React 12/12, Solid 8/8, Vue 10/10, Angular 10/10, and Vanilla 16/16.
- Final approved artifact gate: build/pack produced exactly 7 public packages/tarballs, external tarball smoke passed all 7 including the canonical builder chain in the type consumer, and the private playground built separately. The Angular chunk warning remains unchanged and non-blocking.
- P2 common acceptance harness: `scripts/adapter-acceptance.ts` now drives real mounted sibling roots in React 19, Solid, Vue, Angular, and Vanilla. It covers simultaneous instances, distinct root/popover IDs, command isolation, modal and nonmodal ARIA, dynamic step updates, completion, teardown, and root release.
- P2 common acceptance verification: Biome passed on 100 files, TypeScript passed with no diagnostics, all browser suites passed 61/61 (React 13, Solid 9, Vue 11, Angular 11, Vanilla 17), all unit suites passed 175/175, and `git diff --check` reported no whitespace errors.
- P2 acceptance review found one important coverage gap: the common contract mounted two distinct instances but did not attempt the prohibited same-instance/two-root mount in every adapter. It also noted minor ID-relation and second-root teardown gaps. The shared harness now requires a real duplicate-mount attempt, validates both full ARIA ID families, and verifies both leases are released; framework fixtures were updated.
- P2 acceptance review corrections are green: all five native fixtures now attempt a third root using the already-connected primary tour and preserve the Core lease error through cleanup. The aggregate checks pass again: Biome 100 files, typecheck, browser 61/61, and unit 175/175. A transient Biome failure identified unsafe `throw` statements inside React/Solid cleanup `finally` blocks; cleanup errors are now captured separately and the original mount error retains priority.
- P2 documentation review found and corrected one factual wording error: target resolvers receive `TargetResolverContext` containing an `AbortSignal`, not the signal directly. Re-review approved `project.md` and `todo.md` with no remaining finding.
- P2 acceptance re-review approved the corrections with no blocking finding. One optional strengthening remains for the final P2 review: use distinct initial contents and assert the secondary DOM/modal state remains unchanged after primary mutation and navigation.
- Commit `a9de88c` (`test(adapters): add shared acceptance contract`) contains the shared harness, all five native framework fixtures, and its crash-recovery journal checkpoint.
- Commit `9760ca2` (`docs(project): define current public contract`) rewrites `project.md` as the current implemented contract and reduces `todo.md` to the remaining P3 work.
- Final P2 review found one blocking named-type gap: `GlowTour.state` was readonly but `ReadonlyTourState<T>` was not publicly named/exported. A typecheck RED reproduced TS2724 from a real public import; GREEN adds the named interface, uses it on `GlowTour.state`, and exports it from Core. The review's minor legacy-vocabulary finding was also removed by deleting dead `WorkflowStatus` and moving `next`/`back` focus direction to an internal `FocusDirection`.
- Final P2 re-review approved both corrections with no remaining finding. Generated `dist` is intentionally stale until the mandatory gate rebuild; the final declaration scan must confirm the legacy names disappear there too.
- Commit `93aacb5` (`fix(core): export readonly tour state contract`) contains the reviewed named state type, public export, type-level regression, legacy type cleanup, and its journal checkpoint.
- The final P2 build initially failed because the new `*.browser.ts` suites imported the shared acceptance helper outside each adapter declaration `rootDir`. A release-contract RED reproduced the missing exclusion; React, Vue, Solid, and Vanilla declaration builds now exclude `src/**/*.browser.ts`, keeping all acceptance sources out of published artifacts.
- The complete corrected P2 gate passed: frozen install, Biome, typecheck, 176 unit tests, 61 browser tests, exactly 7 builds and tarballs, registry-backed external tarball installation, separate private playground build, release preparation/publish dry-runs, and targeted manifest/declaration scans. No npm publication occurred.
- Commit `71d9788` (`fix(build): exclude browser acceptance sources`) records the four adapter declaration-build exclusions, their release-contract regression, and the completed P2 gate evidence.
- P2 is complete and independently approved. Its implementation commits are `81f05e7`, `a9de88c`, `9760ca2`, `93aacb5`, and `71d9788`, with journal checkpoints between logical lots.
- P3 inventory confirmed `packages/core/src/utils/animations.ts` has no imports and duplicates active overlay geometry; `HighlightOptions`, `HighlightStepOverrides`, `WorkflowHighlightOptions`, `GlowTourElementName`, and `ViewportDimensions` have no consumers. The five adapter `createGlowTour()` wrappers remain because they provide the required framework-specialized factories and no singleton.
- P3 cleanup RED/GREEN: a release-contract test first failed while the dead module/types existed, then passed after their removal. Biome checked 99 files, typecheck passed, and all 135 Core tests passed.
- Independent P3 cleanup review approved the deletion with no finding. Active Overlay/Popover/Pointer geometry and all five specialized adapter factories remain intact; generated `dist` will be refreshed by the final P3 gate.
- Commit `b092647` (`refactor(core): remove obsolete highlight surface`) contains the approved dead-code/type removal and its regression contract.
- P3 documentation now adds a root README, MIT license, factual unreleased changelog, framework compatibility matrix, stable GitHub Release/OIDC process, and a branch-resolution matrix covering every audit recommendation. Documentation review corrected semver bounds and replaced an incomplete snippet with a mounted React example, then approved the lot with no remaining finding.
- P3 npm metadata adds descriptions, MIT, homepage/bugs, keywords, Node engine, publish files/access, and package-specific side-effect policy to all seven outputs. Shared README/LICENSE/CHANGELOG files are copied into every `dist` and asserted inside each tarball.
- P3 metadata validation exposed a Bun workspace-build interaction: source `sideEffects: false` caused Bun to erase reexported implementations while leaving named exports. The failing external tarball runtime import was the RED. Source manifests now declare only required positive effects (Styles CSS and Vanilla registration); published manifests default the other five packages to `false`. Rebuilt bundles are non-empty and the 7-package external smoke passes.
- Commit `55d6c2a` (`docs(project): add release and compatibility guides`) contains the approved README, MIT license, changelog, compatibility/release guides, audit matrix, and its journal checkpoint.
- Independent P3 release re-review approved the corrected source/published `sideEffects` boundary and strengthened tarball assertions with no remaining finding.
- Commit `1575b33` (`build(packages): complete npm metadata`) contains all seven source metadata manifests, shared document copying, published-manifest side-effect policy, strengthened tarball checks, and its journal checkpoint.
- Final P3 rehearsal is green: frozen install, Biome, typecheck, 180 unit tests, 61 browser tests, 7 builds/tarballs, external registry-backed tarball installation, separate private playground build, and both non-publishing release dry-runs.
- Final artifact inspection confirms no `workspace:*`, `src` export target, raw TypeScript, legacy runtime/status/Highlight declaration, or playground tarball. Core runtime exports only `createGlowTour`; `ReadonlyTourState` is present; all seven manifests carry MIT/engines/public access and the intended package-specific `sideEffects`.
- Final review corrections: the distributable README now uses absolute repository links; package builds prefer Changesets-generated package changelogs with the root changelog only as bootstrap fallback; tarball smoke asserts the selected changelog bytes; the audit matrix and remaining-work ledger now reflect their actual resolution branches.
- P3 final-review RED/GREEN: the release-contract suite first failed on the three relative README links and missing package-changelog selection, then passed 12/12 after correction. Biome checked 99 files and `git diff --check` passed.
- Final independent P3 re-review approved the changelog selection, tarball assertion, absolute README links, audit matrix, remaining-work ledger, defective-version procedure, and recovery instructions with no remaining finding.

- Added the instance-first `createGlowTour<T>()` API, `TourController`, readonly/plain workflow definitions, isolated `ActiveStep` runtime data, and the internal no-op `TourViewDriver` boundary.
- Added operation tokens and abort signals for stale-run invalidation, transition exclusion, cancellation/disposal, abortable target waiting, awaited lifecycle/transition hooks, action execution, normalized terminal failures, coherent readonly state snapshots, and terminal idempotent disposal.
- Retained builder aliases and isolated the old mutable `TourStore` conversion in a clearly marked transitional bridge for the later adapter migration.
- Added controller/definition tests covering readonly isolation, lifecycle/navigation, async errors, concurrency, stale resolution, target strategies, state updates, action execution, disabled navigation, directional skipping, view failures, disposal, and abort behavior.
- Corrected synchronous subscriber reentrancy so a notification-triggered run, cancel, or dispose invalidates the old operation before any later hook, callback, or mutation.
- Added a driver-backed `createGlowTour<T>()` facade with no controller or driver fields exposed to consumers. Its only internal integration point is a non-enumerable, versioned `Symbol.for("@glowhop/core-tour/adapter-bridge/v1")` bridge.
- Added exclusive root leases across duplicate Core copies, root-scoped collision-free IDs, descendant-only element binding, idempotent identity-safe cleanup tokens, release/remount lifecycle handling, and disposal-triggered root release. Root release cancels DOM driver resources without disposing the controller.
- Aligned `canPrevious` with `previous()` on the first step: it is available only when back navigation is enabled and cancellation is allowed.
- Unified abortable timers and removed their abort listeners on normal resolution and abort rejection.
- Moved readonly definition types, step-prop cloning/freezing, and workflow-definition creation into focused `packages/core/src/definition/` modules shared by the builder and active runtime.
- Preserved original action/hook/view rejections when an `error` subscriber synchronously replaces the workflow, while preventing the stale operation from clearing the replacement view.
- Stabilized state subscriptions with an internal listener set and snapshot-copy publication so nested subscriptions receive the current snapshot exactly once and initial-callback disposal cannot retain listeners.
- Stopped an outer state publication as soon as a synchronous listener starts a nested publication, preventing later listeners from observing stale state after newer state.
- Migrated Vue to a specialized `createGlowTour()` factory and named native components only, removing its singleton/store runtime and legacy Core runtime reexports.
- Added a Vue-local private-symbol bridge guard, required `GlowTourRoot` instance injection, reactive `provide`/`inject` nearest-root context, and identity-safe root/element lease cleanup.
- Added Vue happy-DOM coverage for remount/replacement, sibling and nested isolation, IDs/ARIA, dynamic state/visibility, delegated dynamic controls, consumer prevention/disablement, shortcuts, and outside-root errors; SSR coverage proves IDs/ARIA are omitted before client connection.
- Connected Vue root leases synchronously through the native root ref callback and synchronously reconciled `tour`/`idPrefix` changes, so immediate and descendant-mounted `run()` calls see a live root without duplicate or stale lease cleanup.
- Batched Vue parent `tour` and `idPrefix` prop reconciliation with the default pre-flush watcher, preventing an intermediate lease with a new prefix and old tour while retaining synchronous initial ref connection.

- Created the isolated worktree at `.worktrees/audit-p0-release`.
- Installed dependencies with the frozen lockfile using Bun 1.3.12.
- Captured the initial verification baseline.
- Restored the verification baseline with Bun 1.3.12, a product-only Biome scope, and mechanical formatting/import fixes.
- Addressed the P0 review: excluded nested generated `dist` and `coverage` directories from Biome and corrected the P0 product/test file count.
- Addressed the P0 re-review: force-ignored worktrees and generated outputs so Biome's scanner cannot index them through dependency discovery.
- Added deterministic builds for all seven public packages: Bun browser ESM plus declarations for Core/React/Vue/Solid/Vanilla, copied CSS for Styles, and Angular 18.2 APF partial compilation through ng-packagr 18.2.1.
- Replaced package source exports with conditional built-artifact exports, retaining local TypeScript and Bun aliases for the workspace development/test flow.
- Defined React 19-only, Vue, Solid, and Angular peer contracts; moved React types to dev-only; kept internal core dependencies in source as `workspace:*` and rewrote built manifests to `0.1.0`.
- Added deterministic `build`, `pack`, and `test:tarballs` scripts. The smoke contract packs each `dist`, validates contents/manifests, installs all local tarballs with npm outside workspace resolution, and typechecks a seven-package consumer including Angular APF.
- Strengthened the tarball smoke contract to execute Core, React, Vue, Solid, and Vanilla through Node package resolution; typecheck CSS imports with `noUncheckedSideEffectImports`; and compile a standalone Angular application against the Angular APF tarball with `ngc`.
- Added Changesets 3.0.0 with all seven public packages in a fixed group, public access, `main` as the base branch, patch internal dependency updates, and private application versioning disabled.
- Added an auditable Changesets version-PR workflow on `main`; it never publishes packages.
- Added CI for pull requests and `main`, using Bun 1.3.12 with frozen installation, branch/PR concurrency cancellation, read-only contents permission, and the complete package/playground validation sequence.
- Added a GitHub-Release-only npm trusted-publishing workflow: explicit prerelease and tag guards, source/built manifest version validation, npm 11.5.1 on Node 22.14.0, OIDC-only permissions, and the fixed Core → Styles → React → Vue → Angular → Solid → Vanilla publish order from `dist` directories.
- Added a local `release:prepare` dry-run that validates the same artifact manifest contract and prints the publish order without making a registry request.
- Added YAML-parsing release contract tests for triggers, permissions, full-SHA action pins, token absence, Changesets configuration, validation gates, and publish ordering.
- Added canonical GitHub repository metadata to all seven source manifests, including each package directory; generated `dist` manifests and packed tarballs are checked for the same metadata, which npm trusted publishing uses to identify the repository.
- Replaced the build-time `0.1.0` dependency rewrite with source-manifest package versions. Release preparation now accepts source `workspace:*` references but requires every built internal dependency to equal the release version.
- Strengthened the tarball consumer smoke test: it asserts the physical stylesheet files and uses the installed consumer Vite toolchain to bundle `@glowhop/styles-tour/default.css` into CSS output.
- Replaced inline workflow publishes with a resumable release script. It checks each package/version in sequence, skips exact versions already present, stops at the first unexpected registry or publish error, and resumes safely on a rerun. The local `--dry-run` path performs no registry lookup or publish.
- The release workflow now fetches `origin/main` and requires `$GITHUB_SHA` to be an ancestor before any build or publish step.
- The release checkout now uses `fetch-depth: 0` with `persist-credentials: false`; the testable ancestry helper fetches `origin/main` and verifies non-tip ancestors correctly while rejecting commits outside `main`.
- Recorded the playground as a private validation-only app: it remains an independent CI build but is excluded from Changesets, the seven-package build/pack/release order, and tarball smoke inputs.
- Prior functional/doc commits retained in this branch: `3deede7` (`build(packages): emit publishable distributions`), `90079b6` (`test(packages): execute tarball consumer smoke tests`), and `c8b2540` (`docs(audit): record completed package smoke tests`).
- This journal records the functional release-hardening commit and does not list its own documentation commits as implementation commits.

## In progress

- No repository implementation remains. This checkpoint is the authorized P3 head for the verified P0 → P1 → P2 → P3 push.

## Remaining

- External: configure npm trusted publishing for the seven packages before the first stable GitHub Release.

## Verification log

| Command | Result |
| --- | --- |
| P3 final `bun install --frozen-lockfile` / check / typecheck | Pass: Bun 1.3.12 checked 367 installs with no changes; Biome 99 files; no TypeScript diagnostics. |
| P3 corrected final `bun test` | Pass: 181 tests, 0 failures across 21 files. |
| P3 final `bun run test:browser` | Pass: 61/61 across React 13, Solid 9, Vue 11, Angular 11, Vanilla 17. |
| P3 final build/pack | Pass: exactly 7 non-empty publishable distributions and 7 tarballs; playground excluded. |
| P3 corrected final `bun run test:tarballs` | Pass with approved registry access: all 7 tarballs installed and exercised externally; README links and selected package/root changelog content are validated alongside metadata/runtime/CSS/APF. |
| P3 final playground build | Pass as separate private validation; existing Angular 1.38 MB minified chunk warning remains. |
| P3 final release dry-runs | Pass: preparation and publish dry-run print the exact seven-package order without publication. |
| P3 final artifact/declaration scan | Pass: 7 tarballs; correct MIT/engines/access/sideEffects; no source/workspace/raw TS/legacy declarations; Core exposes runtime `createGlowTour` and type `ReadonlyTourState`. |
| P3 final-review correction gate | Pass: release-contract tests 12/12, Biome 99 files, typecheck, browser 61/61, exactly 7 builds/tarballs, separate playground build, both non-publishing dry-runs, and `git diff --check`. |
| Final Git chain verification | Pass: clean P3 worktree before push; P1 descends from P0, P2 from P1, and P3 from P2. |
| Push attempt | Blocked before transfer by the protected execution layer pending explicit approval of the configured `origin`; no remote branch changed. |
| Final push authorization | Approved explicitly by the user for the configured GitHub `origin`; push must remain non-forced and include the four named audit branches. |
| P3 metadata/docs targeted gate | Pass: Biome 99 files, typecheck, 14 release/manifest tests with 169 assertions. |
| P3 metadata initial build/pack | Build and pack created 7 artifacts, but external tarball smoke failed because Bun had erased Core/React/Vue/Solid implementations after reading source `sideEffects: false`. |
| P3 metadata corrected build/pack | Pass: 7 non-empty distributions and 7 tarballs after keeping false side-effect defaults in the published-manifest generator rather than the Bun workspace manifests. |
| P3 metadata corrected `bun run test:tarballs` | Pass with approved registry access: all 7 tarballs retain metadata/docs, exclude dev fields/sources/workspace refs, install externally, import at runtime, bundle CSS, and compile Angular APF. |
| P3 cleanup RED | Red as expected: the Core public-surface test found the unused `packages/core/src/utils/animations.ts`. |
| P3 cleanup focused GREEN | Pass: cleanup contract 1/1, Biome 99 files, typecheck, and Core 135/135 after deleting the dead animation module and five obsolete public types. |
| P2 final `bun run build` initial attempt | Failed: adapter browser suites pulled `scripts/adapter-acceptance.ts` outside declaration `rootDir`; no package artifact was accepted from this run. |
| P2 adapter build-boundary RED | Red as expected: the release-contract test showed all four Bun/tsc adapters lacked `src/**/*.browser.ts` exclusions. |
| P2 adapter build-boundary GREEN and `bun run build` | Pass: regression 1/1 and exactly 7 publishable distributions built after excluding browser acceptance sources. |
| P2 final `bun run pack` | Pass: exactly 7 local tarballs; playground absent. |
| P2 final `bun run test:tarballs` | Sandboxed run stalled and was interrupted; approved registry-backed retry passed the external smoke contract for all 7 tarballs. |
| P2 final `bun run --cwd apps/playground build` | Pass as a separate private-app gate; existing Angular 1.38 MB minified chunk warning remains. |
| P2 final release dry-runs | Pass: preparation and publish dry-run printed Core, Styles, React, Vue, Angular, Solid, Vanilla without registry publication. |
| P2 final artifact scan | Pass: 7 tarballs; no `workspace:*` or `src` target in dist manifests; no legacy runtime/status types in `.d.ts`; Core declarations export `ReadonlyTourState` and runtime `createGlowTour`. |
| P2 final post-correction static/unit gate | Pass: Biome 100 files, typecheck no diagnostics, 176 unit tests across 21 files. |
| P2 final post-correction browser gate | Pass: 61/61 across React 13, Solid 9, Vue 11, Angular 11, Vanilla 17. |
| P2 `ReadonlyTourState` RED `bun run typecheck` | Red as expected with TS2724: Core had no exported member named `ReadonlyTourState`. |
| P2 `ReadonlyTourState` GREEN | Pass: typecheck plus 21/21 root-bridge tests after exporting the named readonly state type. |
| P2 final-review correction focused gate | Initial `bun run check` found only import ordering in the new contract test; after ordering, check/typecheck and 28/28 root-bridge/focus-guard tests passed. |
| P2 final gate `bun install --frozen-lockfile` | Pass; Bun 1.3.12 checked 367 installs across 479 packages with no changes. |
| P2 final legacy API scan | Pass; no old runtime/factory/builder alias remains in product or playground sources; the only `.then()` matches are internal Promise chaining. |
| P2 documentation final `bun run check && git diff --check` | Pass; Biome checked 100 files and the documentation/journal diff has no whitespace errors. |
| P2 acceptance review correction `bun run check` | Initial run failed on two `noUnsafeFinally` diagnostics in React/Solid duplicate-root cleanup; after separating mount and cleanup error capture, pass on 100 files. |
| P2 acceptance review correction `bun run typecheck` | Pass; no TypeScript diagnostics. |
| P2 acceptance review correction `bun run test:browser` | Pass; 61/61 with duplicate-root rejection and full ID/ARIA relation checks in all five adapter fixtures. |
| P2 acceptance review correction `bun test` | Pass; 175 tests, 0 failures across 21 files. |
| P2 acceptance `bun run check` | Pass; Biome checked 100 files with no diagnostics or fixes. |
| P2 acceptance `bun run typecheck` | Pass; TypeScript completed with no diagnostics. |
| P2 acceptance `bun run test:browser` | Pass; 61/61 across React 13, Solid 9, Vue 11, Angular 11, and Vanilla 17. |
| P2 acceptance `bun test` | Pass; 175 tests, 0 failures across 21 files. |
| P2 acceptance `git diff --check` | Pass; no whitespace errors. |
| P1.3C Vue RED `bun test packages/vue/src/vue.test.ts` | Red as expected: `createGlowTour` and `GlowTourCancelTrigger` were missing from the legacy singleton API. |
| P1.3C Vue GREEN | Pass: Vue contract 4/4 and Vue happy-DOM browser suite 7/7, covering root lease lifecycle, instance replacement, root isolation, dynamic controls/content, consumer prevention/disablement, shortcuts, IDs/ARIA, SSR omission, and outside-root errors. |
| P1.3C final gates | Pass: `bun install --frozen-lockfile`, `bun run check`, `bun run typecheck`, `bun test` (164 pass), `bun run test:browser` (React 12, Solid 8, Vue 7), `bun run build`/`bun run pack` (7 each), approved `bun run test:tarballs` (7), playground build, and release prepare/publish dry-runs. |
| P1.3C root timing RED `bun --conditions=browser test packages/vue/src/vue.browser.ts` | Red as expected: immediate post-mount and descendant-mounted `run()` both rejected with `Glow tour requires a connected root before run()`. |
| P1.3C root timing GREEN | Pass: Vue browser 9/9, including immediate and descendant-mounted `run()` plus existing reactive replacement coverage. Final release gates are recorded with the timing-fix commit. |
| P1.3C batched reconciliation RED `bun --conditions=browser test packages/vue/src/vue.browser.ts` | Red as expected: a single parent render logged `release:first`, `connect:first:second-prefix`, `release:first`, then `connect:second`. |
| P1.3C batched reconciliation GREEN | Pass: Vue browser 10/10 logs exactly one release/connect pair for a combined parent update and one final unmount release; immediate mount and descendant `onMounted` runs remain covered. |
| P1 adapter interaction RED | Red as expected: release contracts found the missing browser gate; React's real delegated event advanced despite `preventDefault()`; React/Solid `aria-disabled` remained stale after consumer-disabled toggled; React custom child `disabled` did not disable the trigger; core late-consumer and clear-before-microtask click regressions both commanded synchronously. |
| P1 adapter interaction GREEN | Pass: focused core driver, React browser, Solid browser, and release-contract suites. Covers prevented/nonprevented delegated React clicks, replacement staleness, native/marker/ARIA toggle coherence, custom child disabling, and CI/release browser gating. |
| P1 dynamic adapter triggers RED/GREEN | Red: dynamically mounted React and Solid Cancel controls stayed active after clicks, and a late-inserted core Next control was never commanded. Green: delegated core dynamic/stale tests plus React/Solid browser coverage confirm active Cancel, step-two Back, hide→show Next, native disabled/ARIA, and shortcut metadata. |
| P1 nested/late trigger RED/GREEN | Red: late custom shortcut controls had no `aria-keyshortcuts`; outer-root delegation/synchronization and keyboard permission depended on nested/first rendered controls. Green: focused core observer cleanup/custom shortcut tests and real React/Solid nested-root plus multi-trigger keyboard tests cover ownership, metadata, controller permission, and marker-specific clicks. |
| P1.3A root bridge RED `bun test packages/core/src/runtime/root-bridge.test.ts` | Red; 0 pass, 9 expected failures for the absent bridge and missing connected-root precondition. |
| P1.3A facade-contract RED `bun test packages/core/src/runtime/root-bridge.test.ts --test-name-pattern 'keeps the bridge'` | Red; the returned controller exposed internal driver/state fields rather than the public facade contract. |
| P1.3A focused GREEN | Pass; 69 tests across root bridge, controller, and DOM driver, including Node import safety and active mount-release cleanup. |
| P1.3A static checks | Pass; `bun run typecheck` and `bun run check` (95 files, no diagnostics). |
| P1.3A full test | Pass; `bun test` with 150 tests, 0 failures across 21 files. |
| P1.3A build and pack | Pass; `bun run build` emitted exactly 7 publishable distributions and `bun run pack` created exactly 7 tarballs with no playground artifact. |
| P1.3A tarball smoke | Pass; approved external-consumer `bun run test:tarballs` smoke contract passed for all 7 packages. |
| P1.3A playground build | Pass; `bun run --cwd apps/playground build`; the existing Angular chunk-size warning remains (1.38 MB minified). |
| P1.3A review follow-up RED `bun test packages/core/src/runtime/root-bridge.test.ts packages/core/src/runtime/tour-controller.test.ts` | Red; 7 regressions failed as expected: reentrant lease admission, partial attribute rollback, disposal during claim, root-as-descendant acceptance, active state after release/onStart release, and mutable state facade. |
| P1.3A review follow-up focused GREEN | Pass; 77 tests across root bridge, controller, and DOM driver. Covers transactional/reentrant claims, second-attribute/dispose rollback, resolver/hook release invalidation, idle-listener remount, repeated release, state facade freeze, and remounted click/keyboard commands. |
| P1.3A review follow-up static checks | Pass; `bun run typecheck` and `bun run check` (95 files, no diagnostics). |
| P1.3A review follow-up full test | Pass; `bun test` with 158 tests, 0 failures across 21 files. |
| P1.3A review follow-up build and pack | Pass; `bun run build` and `bun run pack` emitted exactly 7 publishable distributions and 7 tarballs; playground excluded. |
| P1.3A review follow-up tarball smoke | Pass; approved-registry `bun scripts/test-tarballs.ts` exercised the external consumer contract for all 7 tarballs. |
| P1.3A review follow-up playground build | Pass; `bun run --cwd apps/playground build`; existing Angular chunk-size warning remains (1.38 MB minified). |
| P1.3A pending/live correction RED `bun test packages/core/src/runtime/root-bridge.test.ts --test-name-pattern 'pending'` | Red; a pending attribute callback started a run that resolved, and failed pending rollback published `idle`, allowing a state listener to mount a replacement before the original claim threw. |
| P1.3A pending/live correction focused GREEN | Pass; 79 root bridge, controller, and DOM-driver tests. Pending claims reject `run()` as not connected and roll back silently; committed live release retains its documented idle/remount behavior. |
| P1.3A pending/live correction static checks | Pass; `bun run typecheck` and `bun run check` (95 files, no diagnostics). |
| P1.3A pending/live correction full test | Pass; `bun test` with 160 tests, 0 failures across 21 files. |
| P1.3A pending/live correction build and pack | Pass; `bun run build` and `bun run pack` emitted exactly 7 publishable distributions and 7 tarballs; playground excluded. |
| P1.3A pending/live correction tarball smoke | Pass; approved-registry `bun scripts/test-tarballs.ts` exercised the external consumer contract for all 7 tarballs. |
| P1.3A pending/live correction playground build | Pass; `bun run --cwd apps/playground build`; existing Angular chunk-size warning remains (1.38 MB minified). |
| P1.2 DOM driver restoration RED | Red; a focus-restoration handler synchronously started B, leaving stale show state as A and stale clear state as null, so B could not receive keyboard navigation. |
| P1.2 DOM driver restoration focused GREEN | Pass; 65 tests, 0 failures across DOM driver, FocusGuard, and controller. |
| P1.2 DOM driver restoration static checks | Pass; `bun run check` (93 files) and `bun run typecheck` (no diagnostics). |
| P1.2 DOM driver restoration `bun test` | Pass; 139 tests, 0 failures across 20 files. |
| P1.2 DOM driver restoration `bun run build` / `bun run pack` | Pass; exactly 7 publishable distributions and 7 tarballs, with no playground artifact. |
| P1.2 DOM driver restoration `bun run test:tarballs` | Pass with approved registry access; external consumer smoke contract passed for all 7 packages. |
| P1.2 DOM driver restoration playground build | Pass; existing Angular 1.38 MB minified-chunk warning remains. |
| P1.2 DOM driver focus-order RED | Red; a real controller/DOM-driver two-step integration focused the popover rather than next after forward navigation because transition-disabled controls were evaluated by `FocusGuard`. |
| P1.2 DOM driver focus-order focused GREEN | Pass; 63 tests, 0 failures across DOM driver, FocusGuard, and controller. |
| P1.2 DOM driver focus-order static checks | Pass; `bun run check` (93 files) and `bun run typecheck` (no diagnostics). |
| P1.2 DOM driver focus-order `bun test` | Pass; 137 tests, 0 failures across 20 files. |
| P1.2 DOM driver focus-order `bun run build` / `bun run pack` | Pass; exactly 7 publishable distributions and 7 tarballs, with no playground artifact. |
| P1.2 DOM driver focus-order `bun run test:tarballs` | Pass with approved registry access; external consumer smoke contract passed for all 7 packages. |
| P1.2 DOM driver focus-order playground build | Pass; existing Angular 1.38 MB minified-chunk warning remains. |
| P1.2 DOM driver second-review RED `bun test packages/core/src/dom/tour-view-driver.test.ts packages/core/src/state/focus-guard.test.ts packages/core/src/runtime/tour-controller.test.ts` | Red; 5 expected driver failures: denied Escape/ArrowLeft were consumed, native/CSS-hidden modal candidates were wrong, detaching the popover retained focus trapping, a focus-triggered replacement attached stale resources, and an async event callback navigated the replacement. A dedicated FocusGuard native-candidate regression also failed before the shared helper. |
| P1.2 DOM driver second-review focused GREEN | Pass; 62 tests, 0 failures across DOM driver, FocusGuard, and controller. |
| P1.2 DOM driver second-review static checks | Pass; `bun run check` (93 files) and `bun run typecheck` (no diagnostics). |
| P1.2 DOM driver second-review `bun test` | Pass; 136 tests, 0 failures across 20 files. |
| P1.2 DOM driver second-review `bun run build` | Pass; exactly 7 publishable package distributions built. |
| P1.2 DOM driver second-review `bun run pack` | Pass; exactly 7 tarballs in `.artifacts/tarballs`, no playground artifact. |
| P1.2 DOM driver second-review `bun run test:tarballs` | Sandboxed attempt stalled after startup; approved registry retry passed the smoke contract for all 7 packages. |
| P1.2 DOM driver second-review `bun run --cwd apps/playground build` | Pass; the existing Angular 1.38 MB minified-chunk warning remains. |
| P1.2 DOM driver review `bun test` | Pass; 131 tests, 0 failures across 20 files. |
| P1.2 DOM driver review `bun run build` | Pass; publishable distributions built for exactly 7 packages. |
| P1.2 DOM driver review `bun run pack` | Pass; exactly 7 tarballs in `.artifacts/tarballs`, with no playground artifact. |
| P1.2 DOM driver review `bun run test:tarballs` | Sandboxed attempt stalled after invoking the external consumer; approved registry retry passed the smoke contract for all 7 packages. |
| P1.2 DOM driver review `bun run --cwd apps/playground build` | Pass; existing Angular 1.38 MB minified chunk-size warning remains. |
| P1.2 DOM driver review RED `bun test packages/core/src/dom/tour-view-driver.test.ts` | Red; 5 expected failures: 10px same-placement popover geometry was suppressed, nested contenteditable triggered advance, pre-aborted show invoked scroll, stale show resolved after a newer show/clear, and disposal did not cancel pending animations. |
| P1.2 DOM driver review focused GREEN `bun test packages/core/src/dom/tour-view-driver.test.ts packages/core/src/elements/pointer.test.ts packages/core/src/state/focus-guard.test.ts packages/core/src/runtime/tour-controller.test.ts` | Pass; 61 tests, 0 failures. Covers clear/dispose abort cleanup, active replacement/rebinding, prototype-accessor DOMRect snapshots, keyboard/cancel permission, modal Tab semantics, and pointer policy. |
| P1.2 DOM driver review static checks | Pass; `bun run check` (92 files) and `bun run typecheck` (no diagnostics). |
| P1.2 DOM driver RED `bun test packages/core/src/dom/tour-view-driver.test.ts` | Red; the new focused suite could not import `DomTourViewDriver` because it did not yet exist. An earlier fixture attempt failed only due to Core not resolving adapter-only `happy-dom`, so the test uses a local DOM fixture and no dependency change. |
| P1.2 focused DOM/controller `bun test packages/core/src/dom/tour-view-driver.test.ts packages/core/src/runtime/tour-controller.test.ts` | Pass; 41 tests, 0 failures. |
| P1.2 `bun run check` | Pass; Biome checked 92 files with no fixes. |
| P1.2 `bun run typecheck` | Pass; no TypeScript diagnostics. |
| P1.2 `bun test` | Pass; 119 tests, 0 failures across 20 files. |
| P1.2 `bun run build` | Pass; exactly 7 public distributions built. |
| P1.2 `bun run pack` | Pass; exactly 7 local library tarballs packed; playground absent. |
| P1.2 `bun run test:tarballs` | Pass with approved registry access; the sandboxed attempt produced no completion output within 30 seconds, then the external consumer smoke contract passed for all 7 packages. |
| P1.2 `bun run --cwd apps/playground build` | Pass; private playground gate only. Existing Angular chunk-size warning remains (1.38 MB minified). |
| P1 nested publication review RED | Red; the second existing listener received `replacement:starting` followed by stale `old:finished`. |
| P1 nested publication focused tests | Pass; 6 subscription/publication tests, 0 failures. |
| P1 nested publication controller tests | Pass; 33 tests, 0 failures. |
| P1 nested publication `bun run check` | Pass; Biome checked 91 files with no fixes. |
| P1 nested publication `bun run typecheck` | Pass; no TypeScript diagnostics. |
| P1 nested publication `bun test` | Pass; 111 tests, 0 failures across 19 files. |
| P1 nested publication `bun run build` | Pass; 7 public distributions built. |
| P1 nested publication `bun run pack` | Pass; 7 tarballs packed. |
| P1 nested publication `bun run test:tarballs` | Pass with registry access; smoke contract passed for all 7 packages. |
| P1 nested publication `bun run --cwd apps/playground build` | Pass; known Angular chunk-size warning only. |
| P1 subscription review RED | Red; action, hook, and view errors stopped rejecting after an `error` subscriber ran a replacement workflow, and a nested subscriber received `starting` twice. |
| P1 subscription review focused controller tests | Pass; 32 tests, 0 failures. |
| P1 subscription review `bun run check` | Pass; Biome checked 91 files with no fixes. |
| P1 subscription review `bun run typecheck` | Pass; no TypeScript diagnostics. |
| P1 subscription review `bun test` | Pass; 110 tests, 0 failures across 19 files. |
| P1 subscription review `bun run build` | Pass; 7 public distributions built. |
| P1 subscription review `bun run pack` | Pass; 7 tarballs packed. |
| P1 subscription review `bun run test:tarballs` | Pass with registry access; smoke contract passed for all 7 packages. The sandboxed run stalled while accessing the registry. |
| P1 subscription review `bun run --cwd apps/playground build` | Pass; known Angular chunk-size warning only. |
| P1 review RED `bun test packages/core/src/runtime/tour-controller.test.ts --test-name-pattern 'reentrant\|exposes previous\|removes the'` | Red; 7 failures reproduced stale hooks/callbacks, mismatched first-step permission, and two leaked timer listeners. |
| P1 review focused controller tests | Pass; 27 tests, 0 failures, including synchronous run/cancel/dispose reentrancy and timer cleanup on resolve/abort. |
| P1 review `bun run check` | Pass; Biome checked 91 files with no fixes. |
| P1 review `bun run typecheck` | Pass; no TypeScript diagnostics. |
| P1 review `bun test` | Pass; 105 tests, 0 failures across 19 files. |
| P1 review `bun run build` | Pass; 7 public distributions built. |
| P1 review `bun run pack` | Pass; 7 tarballs packed. |
| P1 review `bun run test:tarballs` | Pass with registry access; the sandboxed attempt first reproduced the known misleading `react@undefined` registry-resolution failure. |
| P1 review `bun run --cwd apps/playground build` | Pass; known Angular chunk-size warning only. |
| Initial `bun test packages/core/src/runtime/tour-controller.test.ts` | Red; 2 passed, 8 failed because object casts were not real `HTMLElement` targets. Fixtures were corrected to controlled resolvers without weakening runtime validation. |
| Initial `bun run typecheck` | Red; 5 readonly/legacy migration errors in builder definitions, old engine tests, and `TourStore`. |
| Added requirement regressions | Red; actions, disabled navigation, go-to hooks, aliases, deep readonly data/options, reverse skip, and unexpected abort handling failed before implementation. |
| Final `bun test packages/core/src/runtime/tour-controller.test.ts` | Pass; 20 passed, 0 failed. |
| Final `bun run check` | Pass; Biome checked 87 files with no fixes. |
| Final `bun run typecheck` | Pass; no TypeScript diagnostics. |
| Final `bun test` | Pass; 98 tests, 0 failures across 19 files. |
| Final `bun run build` | Pass; 7 public distributions built. |
| Final `bun run pack` | Pass; 7 tarballs packed. |
| Final `bun run test:tarballs` | Pass; external tarball consumer command exited successfully. |
| Final `bun run --cwd apps/playground build` | Pass; known Angular chunk-size warning only. |
| `bun install --frozen-lockfile` | Pass; 294 packages installed with Bun 1.3.12. |
| `bun run check` | Pass after P0 re-review; Biome checked 76 files in 27ms with no fixes applied. |
| `bun run typecheck` | Pass after P0 re-review; TypeScript completed with no diagnostics. |
| `bun test` | Pass after P0 re-review; 62 tests, 0 failures across 13 files in 457ms. |
| `bun install` | Pass; resolved Angular packaging dependencies and updated `bun.lock`. |
| `bun run check` | Pass; Biome checked 82 files with no fixes applied. |
| `bun run typecheck` | Pass; TypeScript completed with no diagnostics. |
| `bun test` | Pass; 62 tests, 0 failures across 13 files in 451ms. |
| `bun run build` | Pass; built publishable distributions for all 7 packages. |
| `bun run pack` | Pass; packed 7 local tarballs from `dist` without publishing. |
| `bun run test:tarballs` | Pass; npm-installed, typechecked external consumer for all 7 tarballs including Angular APF. |
| `bun run --cwd apps/playground build` | Pass; Vite built all framework playground entries (Angular bundle warning only). |
| `bun run test:tarballs` (follow-up) | Pass; executed five Node adapter entries, strict CSS side-effect resolution using TypeScript 5.7, and Angular standalone `ngc` compilation using Angular-compatible TypeScript 5.5. |
| `bun test scripts/release-contract.test.ts` | Pass; 5 workflow/config contract tests, including trigger, permissions, action-pin, OIDC/token, fixed-group, validation-gate, and publish-order checks. |
| `bun run release:prepare` | Pass; non-publishing dry-run validated all source and built manifests and printed the seven-package publish order. |
| `bun test scripts/{package-manifests,prepare-release,publish-release,release-contract}.test.ts` | Pass; 13 targeted tests cover dynamic internal-version rewrites, bumped-release validation, canonical metadata, ancestry gating, resilient publish skip/stop/order, and offline dry-run behavior. |
| `bun run release:publish -- --dry-run` | Pass; printed the exact seven package@version order without a registry lookup or npm publish. |
| `bun test scripts/release-ancestry.test.ts` | Pass; a local bare Git repository proves a historical `main` ancestor passes after fetch while a commit on an outside branch fails. |
| Final `bun install --frozen-lockfile` | Pass; 365 installs checked with no changes. |
| Final `bun run check` | Pass; Biome checked 83 files with no fixes. |
| Final `bun run typecheck` | Pass; no TypeScript diagnostics. |
| Final `bun test` | Pass; 77 tests, 0 failures across 18 files. |
| Final `bun run build` | Pass; exactly 7 public package distributions built. |
| Final `bun run pack` | Pass; exactly 7 public package tarballs created; playground excluded. |
| Final `bun run test:tarballs` | Pass with npm registry access; all 7 tarballs installed and exercised externally. A prior sandboxed attempt failed only because npm registry DNS returned `ENOTFOUND`, which npm reported misleadingly as `react@undefined`; no manifest or peer conflict was present. |
| Final `bun run --cwd apps/playground build` | Pass as a separate private-app gate; the pre-existing Angular chunk-size warning remains. |
| Final release preparation and publish dry-run | Pass; exact seven-package order printed without publication. |

## P1.3D Angular review follow-up (2026-08-20)

- RED `bun --conditions=browser test ./packages/angular/src/angular.browser.ts --test-name-pattern 'reacts to dynamic'`: 0 pass, 1 fail; after the host changed `nextLabel`, the rendered label remained `Next one` instead of `Next two`.
- GREEN `bun --conditions=browser test ./packages/angular/src/angular.browser.ts --test-name-pattern 'reacts to dynamic' && bunx tsc -p tsconfig.json --noEmit`: 1 pass, 0 fail and no TypeScript diagnostics after trigger setters synchronize backing Angular signals. `booleanAttribute` makes a bare `disabled` binding true; each trigger updates text, native disabled state, ARIA, and consumer-disabled marker together.
- GREEN `bun --conditions=browser test ./packages/angular/src/angular.browser.ts --test-name-pattern 'cleans a removed|required tour'`: 2 pass, 0 fail. A real Angular bootstrap error handler receives the clear missing-root-tour failure, and detached/recreated elements release then rebind their scoped bridge binding.
- Angular focused verification: `bun --conditions=browser test ./packages/angular/src/angular.browser.ts` passed 9/9; `bun test packages/angular/src/angular.test.ts` passed 3/3; `bunx tsc -p tsconfig.json --noEmit` passed; `bunx ng-packagr --project packages/angular/ng-package.json` passed with Ivy partial compilation.
- Coverage now includes immediate descendant `ngOnInit` workflow start, atomic tour/idPrefix replacement log, nested/sibling scope isolation, late trigger shortcut registration, dynamic step title/content/footer/button visibility, Back/Next/Cancel with prevented delegated command, consumer disabled toggling, trigger ARIA/labels, cleanup/recreation, outside-root injection, and a missing required root input.
- Final `bun install --frozen-lockfile`: pass; 367 installs checked with no changes.
- Final `bun run check`: pass; Biome checked 101 files with no fixes. Final `bun run typecheck`: pass with no diagnostics. Final `bun test`: pass; 164 tests, 0 failures across 21 files.
- Final `bun run test:browser`: pass; React 12/12, Solid 8/8, Vue 10/10, and Angular 10/10. Final `bun run build` and `bun run pack`: pass; exactly 7 public distributions and 7 tarballs.
- Final `bun run test:tarballs`: pass with registry access; all 7 external consumers passed, including the Angular standalone `ngc` fixture that binds the required `[tour]` root input. Final Angular APF declaration scan: pass; no `GlowTourService`, `glowTour`, `createTourStore`, `TourStore`, or `WorkflowInstance` declaration appears in `packages/angular/dist`.
- Final `bun run --cwd apps/playground build`, `bun run release:prepare`, and `bun run release:publish -- --dry-run`: pass. The existing 1.38 MB minified Angular playground chunk warning remains.
- P1.3D quality coverage was added tests-first against an already-green implementation: `bun --conditions=browser test ./packages/angular/src/angular.browser.ts --test-name-pattern 'sibling root|dynamic trigger'` passed 2/2. The new cases bootstrap two sibling roots, assert their distinct root/popover IDs and delegated command isolation, dispatch bubbling synthetic clicks while consumer-disabled (including Back and Cancel), toggle disabled in both directions, and update `finishLabel` dynamically on the last step.
- Mutation RED evidence: temporarily removing the Angular `finishLabel` backing-signal setter made `bun --conditions=browser test ./packages/angular/src/angular.browser.ts --test-name-pattern 'dynamic trigger'` fail 0/1: the last-step control rendered `Finish tour` rather than `Finish one`. The setter was restored before the GREEN rerun, which passed 2/2 with the Angular contract suite (3/3) and typecheck.
- Quality final gates: `bun --conditions=browser test ./packages/angular/src/angular.browser.ts` passed 10/10; `bun install --frozen-lockfile`, `bun run check`, and `bun run typecheck` passed; `bun test` passed 164/164 across 21 files; `bun run test:browser` passed React 12/12, Solid 8/8, Vue 10/10, Angular 10/10; `bun run build`, `bun run pack`, and registry-backed `bun run test:tarballs` passed for 7 packages; playground build and both release dry-runs passed. The existing Angular playground chunk-size warning remains.
- At this checkpoint, legacy Core export narrowing remained deferred until every public adapter had adopted the instance-scoped facade; P1 later completed that migration.

## P1.3E Vanilla root property injection (2026-08-20)

- RED `bun test packages/vanilla/src/vanilla.test.ts`: 0 pass, 2 fail; the legacy singleton-only package exposed no `createGlowTour()` factory. RED `bun test --conditions=browser ./packages/vanilla/src/vanilla.browser.ts`: unresolved `happy-dom` dependency before it was declared for the real Vanilla DOM suite.
- The Vanilla public surface now exports only `createGlowTour`, intentional custom-element metadata/types, and the `VanillaGlowTour` content type. Auto-registration is retained as the existing convention, guarded so Node/SSR imports evaluate without `HTMLElement`, `customElements`, or `document` and duplicate names are never redefined.
- `<glow-tour-root>.tour` is the sole instance injection point. A root connects the adapter-local private bridge only while connected with a non-null tour; active `(tour, idPrefix)` replacement is microtask-batched, and null/disconnect releases its exact lease. Generated child IDs and ARIA links are cleared before same-prefix reuse; nested roots are excluded.
- Descendant custom elements resolve the closest root and subscribe only to that tour's readonly state. Popover, overlay, pointer, header, content, footer, Back, Next, and Cancel rebind on root changes; Core controls retain delegated marker handling, consumer disabled/ARIA state, default prevention, and dynamic shortcut labels.
- GREEN focused checks: Vanilla contract 2/2 and happy-dom browser suite 6/6. Coverage includes setter before/after connect, null/remount, batched replacement, sibling/nested identity isolation, unique root-local IDs/ARIA, dynamic content and element rebinding, Cancel/Back/late Next, consumer disabled toggling, prevented click, custom shortcut, and duplicate live-instance rejection.
- Final `bun install --frozen-lockfile`, `bun run check`, and `bun run typecheck`: pass; 367 installs checked, Biome checked 103 files, and TypeScript emitted no diagnostics. Final `bun test`: pass; 163 tests across 21 files. Final `bun run test:browser`: pass; React 12/12, Solid 8/8, Vue 10/10, Angular 10/10, Vanilla 6/6.
- Final `bun run build`, `bun run pack`, and registry-backed `bun run test:tarballs`: pass for seven public packages. The Vanilla tarball consumer imports `createGlowTour`; playground and both release dry-runs pass. The existing 1.38 MB minified Angular playground warning remains.

## P1.3E Vanilla ownership review follow-up (2026-08-20)

- RED real happy-dom coverage: an unknown `glow-tour-root` with own `tour`/`idPrefix` expandos upgraded without its runtime methods (`this.reconcile is not a function`); an explicit `contained-*` ID family inside its claimed root was rejected as an in-use Core prefix; moving a generated popover left the old IDs/ARIA behind; and consumer `disabled` changes were overwritten by driver synchronization.
- GREEN root and ownership model: root runtime state is a `WeakMap`, so property replay deletes each own expando then invokes its prototype setter during connect. `ManagedAttributes` snapshots exact prior absence/value per element and only restores an attribute when its current value remains adapter-owned. Explicit header/content/popover IDs therefore remain authoritative and default relationship values derive from those effective IDs.
- GREEN lifecycle: scoped elements release subscriptions/bindings and restore their owned attributes on disconnect before resolving the nearest new root. Trigger restoration suspends disabled tracking while snapshots are replayed, eliminating reentrant attribute writes on root release/reconnect.
- GREEN disabled ownership: Vanilla marks its controls as adapter-managed, so the Core driver retains delegated command and consumer-marker checks but does not overwrite the adapter's native `disabled`/ARIA representation. Native property interception plus `setAttribute`/`removeAttribute` wrappers records consumer intent in idle, active, and capability-disabled states; the observer remains a fallback for other DOM mutation APIs.
- GREEN Core collision rule: `reservePrefix` accepts generated-name collisions only where the matching existing IDs are descendants of the root currently being claimed. Document reservations and IDs outside that root still reject; duplicate authored IDs are deliberately left to the author DOM.
- Focused GREEN: `bun test packages/core/src/runtime/root-bridge.test.ts packages/core/src/dom/tour-view-driver.test.ts` passed 56/56; `bun test --conditions=browser ./packages/vanilla/src/vanilla.browser.ts` passed 11/11, including pre-upgrade replay, matching authored IDs/ARIA, move-out/root-A-to-B, disabled property/attribute ownership, and generated Finish label after reconnect.
- Final source gates: `bun install --frozen-lockfile`, `bun run check`, and `bun run typecheck` passed (367 installs, 103 files, no diagnostics). `bun test` passed 165/165 across 21 files; `bun run test:browser` passed React 12/12, Solid 8/8, Vue 10/10, Angular 10/10, Vanilla 11/11. `bun run build` and `bun run pack` passed for all seven public packages. Playground build and both release dry-runs passed; the existing Angular 1.38 MB chunk warning remains.
- Tarball smoke note: the sandboxed `bun run test:tarballs` exceeded its local execution window; its required elevated npm-registry attempt was rejected by the environment usage limit, so this follow-up cannot claim a fresh external-registry smoke result. The preceding P1.3E tarball gate passed unchanged before this source-only ownership follow-up.

## P1.3E Vanilla final ownership review follow-up (2026-08-20)

- RED Core collision coverage: with a matching ID inside the claimed root first in document order and a second matching ID outside it, `getElementById` accepted the prefix. The new test runs both document orders and now rejects either external collision.
- RED connected ownership coverage: after a consumer changed generated header ID, popover ARIA, and trigger ARIA while connected, the next adapter render rewrote the header. `ManagedAttributes` now relinquishes a snapshot when the live DOM differs from its last adapter-owned value; the exact current value or absence remains consumer-owned through update, release, and remount.
- RED consumer ARIA coverage: authored `aria-disabled="true"` did not disable the native control or publish the consumer marker. Trigger initialization and `aria-disabled` property mutations now participate in the same consumer-intent model as native disabled; adapter writes run under a synchronization guard, and the mutation observer is only the fallback for mutation APIs that bypass wrappers.
- RED descriptor coverage: trigger cleanup deleted pre-existing own `disabled`, `setAttribute`, and `removeAttribute` descriptors. Tracking now snapshots exact own descriptors, restores only its still-installed wrappers, and preserves consumer replacements made while connected.
- GREEN focused: `bun test packages/core/src/runtime/root-bridge.test.ts packages/core/src/dom/tour-view-driver.test.ts` passed 57/57; `bun test --conditions=browser ./packages/vanilla/src/vanilla.browser.ts` passed 14/14; `bun run typecheck` passed.
- GREEN offline gates: `bun install --frozen-lockfile` checked 367 installs with no changes; `bun run check` checked 103 files; `bun test` passed 166/166 across 21 files. Browser retry passed React 12/12, Solid 8/8, Vue 10/10, Angular 10/10, Vanilla 14/14. `bun run build`, `bun run pack`, playground build, `release:prepare`, and publish dry-run passed. The existing Angular chunk-size warning remains.
- External blockers: no fresh `test:tarballs` is claimed—the last prior tarball smoke remains the only attested one, because the required npm-registry escalation was rejected by the environment usage limit. The worktree remains deliberately uncommitted because the same environment limit rejected the required linked-worktree Git escalation.

## P1.3E Vanilla final disabled-tracking review follow-up (2026-08-20)

- RED same-tick ARIA test: setting `aria-disabled` true then false without a settle, followed by trigger remove/reappend, restored a stale native `disabled` attribute. `setConsumerDisabled` had discarded the adapter's native snapshot before synchronizing the new state.
- GREEN same-tick ownership: the native snapshot is retained until a real external native change makes `ManagedAttributes` relinquish it. True/false ARIA intent now updates native disabled and the consumer marker synchronously, and both false and true survive immediate trigger remounts without mutation-observer timing.
- RED non-configurable setup: a non-configurable own delegating `setAttribute` caused the old all-or-nothing descriptor guard to skip the configurable `disabled` wrapper, so a consumer disabled property set before run was erased by start.
- GREEN independent setup: wrappers install only for individually configurable own properties; the mutation observer always attaches. When no disabled wrapper is available, the first adapter sync adopts the native/ARIA/marker state so start preserves consumer intent. The non-configurable original descriptor remains exact after cleanup.
- GREEN focused: Core focused suites passed 57/57, Vanilla happy-dom passed 16/16, then typecheck and Biome passed. Full offline verification passed: frozen install (367), unit 166/166, browser React 12/12, Solid 8/8, Vue 10/10, Angular 10/10, Vanilla 16/16, build/pack 7/7, playground build, and both release dry-runs. Existing Angular chunk warning remains.
- External blockers unchanged: fresh npm-registry tarball smoke and the linked-worktree Git commit remain unattempted/blocked by the environment usage limit; the prior commit's tarball smoke is the last attested external smoke result.

## P1.3E Vanilla live delegated-click review follow-up (2026-08-20)

- RED delegated-command coverage: Core deferred a click even after the live trigger had native `disabled`, `aria-disabled="true"`, or the consumer-disabled marker, because `canCommand` consulted only the marker.
- GREEN Core guard: click delegation now reads live native disabled, ARIA disabled, and the marker both before it queues the command and in the queued microtask. Keyboard capability handling and `syncControl` behavior are untouched.
- GREEN Vanilla coverage: a non-configurable delegating `setAttribute` button can set `aria-disabled="true"` and click in the same task without advancing; after `aria-disabled="false"` and native disabled false, the click advances. This proves the command guard does not wait for MutationObserver delivery.
- GREEN final offline verification: Core focused passed 58/58; Vanilla focused passed 16/16; frozen install checked 367 packages; unit passed 167/167; browser passed React 12/12, Solid 8/8, Vue 10/10, Angular 10/10, Vanilla 16/16; build/pack 7/7, playground build, and both release dry-runs passed. Existing Angular chunk warning remains.
- Fresh external tarball verification on 2026-08-22: `bun run test:tarballs` passed the external consumer smoke contract for all 7 packages after explicit user authorization. The approved Vanilla follow-up is ready for its linked-worktree Git commit.
- Fresh pre-commit gate on 2026-08-22: frozen install checked 367 packages with no changes; Biome checked 103 files; typecheck emitted no diagnostics; unit tests passed 167/167; browser tests passed React 12/12, Solid 8/8, Vue 10/10, Angular 10/10, and Vanilla 16/16; build and pack produced exactly 7 public packages/tarballs; the private playground built separately. The existing Angular playground chunk-size warning remains non-blocking.

## P1 Core public-surface cleanup (2026-08-22)

- Core now exposes `createGlowTour` as its only runtime value. `Builder`, `StepBuilder`, and their event type remain type-only/internal so P2 can complete the builder contract without publishing another instance factory.
- Deleted the obsolete `TourStore`, `createTourStore`, `WorkflowInstance`, `createWorkflow`, and `WorkflowStep` implementations and the dedicated legacy workflow tests. Geometry tests now use the readonly `TourElementStep` contract directly.
- Removed `cancelLabel` from Core popover options and from React, Solid, Vue, and Vanilla cancellation controls. Framework-native children/slots/content and `aria-label` remain the customization path; Angular was already compliant.
- Updated the tarball consumer to import `createGlowTour` and assert that the installed Core runtime namespace contains exactly that value.
- Targeted verification passed 56/56 across Core element/root contracts and all adapter public contracts. Typecheck passed with no diagnostics.
- Final P1 source verification passed: frozen install checked 367 installs with no changes; Biome checked 100 files; typecheck emitted no diagnostics; unit tests passed 167/167 across 21 files; browser tests passed React 12/12, Solid 8/8, Vue 10/10, Angular 10/10, and Vanilla 16/16.
- Distribution verification passed: build and pack produced exactly 7 public packages; the Core ESM namespace contains only `createGlowTour`; external tarball smoke passed for all 7 packages; the private playground built separately; release preparation and publication dry-runs preserved the required seven-package order without publishing. The existing Angular playground chunk-size warning remains non-blocking.
- Independent review found that deleting the legacy workflow suite also removed two presentation-default assertions. They were migrated to a focused `ActiveStep` test, which now validates both workflow inheritance and step-level overrides against the actual runtime owner.
- Independent re-review approved the migrated `ActiveStep` coverage with no remaining finding.
- Final P1 distribution gate passed again: build and pack produced exactly 7 public packages/tarballs, external tarball installation passed for all 7 packages, and the private playground built separately before the cleanup commit.
- P1 completion: `bfd0ebe refactor(core): remove legacy runtime surface` records the final code cleanup. All P1 tasks are complete and independently approved; no P1 blocker remains.

## Decisions and deviations

- `createGlowTour<T>()` is the only new public instance factory; `TourController` and `TourViewDriver` remain internal implementation types.
- The private adapter bridge is intentionally neither a root export nor a package subpath. Adapters must repeat the stable symbol string and make their own `unknown` structural/version guard. Narrowing the existing legacy Core runtime exports is explicitly deferred until all adapters migrate; this task only asserts that no new runtime root export was added.
- A root lease is the sole owner of DOM mount registration. It may be released and reconnected; only `dispose()` is terminal. The root marker and document prefix reservation both use global symbols so duplicate Core modules cannot claim the same root or IDs.
- Nonterminal root release is a hook-free cancellation boundary: it aborts the current controller operation, clears workflow state to `idle`, releases the old DOM lease, then publishes `idle`. It never calls public cancel hooks; a later connected mount can run a new workflow.
- Async commands reject after disposal with `Tour controller is disposed`; `updateCurrentStep` and repeated `dispose` are no-ops.
- Public definitions and state snapshots freeze nested mutable data/option arrays deeply enough for their supported value contracts; active observables remain internal.
- A resolver-originated `AbortError` is terminal unless the controller token/signal was actually invalidated; only stale controller-owned aborts are ignored.
- The DOM driver consumes the already-resolved `ActiveStep.target`; it never reruns an async resolver while tracking. `events` is the default tracking mode and `continuous` is opt-in.
- The internal command interface is injected by `TourController` through optional `setCommands`; scoped next/back button clicks and keyboard actions share the dynamic step-permission checks without reading or mutating controller internals directly.
- Core test coverage uses a local DOM fixture rather than adding a dependency already owned only by the Solid adapter. The fixture restores global descriptors, so it remains isolated after adapter browser tests.

- The implementation runs in an ignored project-local worktree to keep `main` untouched.
- Biome is intentionally scoped to `apps/**`, `packages/**`, and its product configuration files. `!!.worktrees`, `!!apps/**/dist`, `!!apps/**/coverage`, `!!packages/**/dist`, and `!!packages/**/coverage` force-ignore worktrees and generated output recursively, preventing scanner indexing while retaining the product-only source scope.
- The public `boolean | void` action-result type is intentionally retained with a targeted Biome suppression; replacing `void` would alter its public TypeScript contract.
- Angular uses `ng-packagr` 18.2.1 and `@angular/compiler-cli` 18.2.13 with TypeScript 5.5.4, its compatible compiler range. The abstract reactive component is decorated as an Angular directive so partial compilation can emit APF safely.
- Dist manifests are generated from source manifests, strip development-only fields, rewrite every known internal `workspace:*` dependency to its target package's current source-manifest version, and expose only artifact-relative entries. Generated `dist` and `.artifacts` remain untracked and excluded from Biome.
- The playground was moved to React 19 to match the React adapter peer contract. Vite warns that the Angular demonstration bundle is 1.38 MB minified; this is not changed in P0 because runtime/code-splitting work is outside the packaging scope.
- Angular 18.2 requires TypeScript `<5.6`, while `noUncheckedSideEffectImports` begins in TypeScript 5.6. The generated consumer therefore installs a second, temporary TypeScript 5.7 compiler only for strict CSS resolution and keeps `ngc` on TypeScript 5.5.4.
- Actions are pinned to full commit SHAs verified with `git ls-remote` against the official action repositories: checkout v4.2.2, setup-bun v2.2.0, setup-node v4.4.0, and changesets/action v2.1.0. The release workflow never reads `NPM_TOKEN`, `NODE_AUTH_TOKEN`, or repository secrets; it uses GitHub OIDC with only `id-token: write` in addition to `contents: read`.
- The Changesets workflow needs `contents: write` and `pull-requests: write` solely to create/update the version PR. It has no publish script or npm credentials.
- `@glowhop/playground` is a private validation app, not a package artifact. It is never bundled, packed, versioned, included in a tarball, or published; CI builds it separately.
- The canonical package repository is `git+https://github.com/Glowhop/glow-tour.git`; the local `git@github-perso:` SSH remote is intentionally never published in npm metadata.
- A release must use a protected `v*` tag policy and npm trusted-publisher bootstrap for this exact GitHub repository/workflow before first publishing. Those controls are external GitHub/npm settings and are documented here, not emulated in repository configuration.
- Forward recovery after a failed release is a rerun of the same published GitHub Release after fixing the failure. The script preflights each package/version, skips those already visible on npm, then continues in the fixed order; it never overwrites a published version.
- Full checkout history is required for the release ancestry guard. `fetch-depth: 0` provides it without persisting GitHub credentials after checkout; the helper still fetches the current `origin/main` ref immediately before the decision.

## Main files changed

- P1 controller follow-up: `packages/core/src/definition/`, `packages/core/src/builder/index.ts`, `packages/core/src/runtime/{active-step,tour-controller}.ts`, and controller regression tests.
- P1.2 DOM driver: `packages/core/src/dom/tour-view-driver.{ts,test.ts}`, element structural geometry contracts, runtime command binding, behavior option merging, and this audit journal.
- P1.3A root bridge: `packages/core/src/runtime/root-bridge.{ts,test.ts}`, the `createGlowTour` facade/type contract, and DOM-driver mount release.
- P1.3C Vue adapter: `packages/vue/src/{adapter-bridge,glow-tour,index,vue.browser,vue.test}.ts`, `packages/vue/src/components/tour-components.ts`, the Vue playground, browser runner/release contract, and Bun test dependencies.
- P1.3D Angular adapter: `packages/angular/src/{adapter-bridge,angular.browser,angular.test,lib/glow-tour,lib/components/tour-components,public-api}.ts`, the Angular playground, browser/release/tarball contracts, and `.superpowers/sdd/p1-angular-report.md`.

- `package.json`, `bunfig.toml`, `tsconfig.json`, and `scripts/{build-packages,pack-packages,test-tarballs}.ts`
- `packages/*/package.json`, declaration build configs, `packages/angular/ng-package.json`, and explicit public entrypoints.
- `apps/playground/package.json`, `biome.json`, `.gitignore`, `bun.lock`, source-manifest contract tests, and the Styles CSS declaration.
- `.changeset/config.json`, `.github/workflows/{ci,changesets,release}.yml`, `scripts/{prepare-release,release-contract.test}.ts`, and root release scripts/dependencies.
- P3 final lot: `README.md`, `LICENSE`, `CHANGELOG.md`, `docs/{compatibility,release}.md`, package metadata, `scripts/{build-packages,test-tarballs,release-contract.test}.ts`, `AUDIT_RECOMMANDATIONS.md`, `todo.md`, and this journal.

## Recovery instructions

1. Open `.worktrees/audit-p0-release`; this retained worktree hosts `codex/audit-p3-polish`.
2. Confirm the branch and the eight pending files with `git status --short --branch`.
3. Verify that `origin` contains the four named branch heads. If any is absent, push only the missing verified branch without force; otherwise the only remaining action is external npm trusted-publishing configuration.
