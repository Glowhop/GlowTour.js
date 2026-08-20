# Audit implementation progress

Last updated: 2026-08-20

## Current position

- Branch: `codex/audit-p1-runtime`
- Parent branch: `codex/audit-p0-release` at `577bd46`
- Last completed P1 implementation: `f6764e9` (`refactor(core): add instance-first tour controller`).
- Current task: P1 controller review corrections completed.
- Next action: concrete DOM view driver, cleanup, and positioning.

## Completed

- Added the instance-first `createGlowTour<T>()` API, `TourController`, readonly/plain workflow definitions, isolated `ActiveStep` runtime data, and the internal no-op `TourViewDriver` boundary.
- Added operation tokens and abort signals for stale-run invalidation, transition exclusion, cancellation/disposal, abortable target waiting, awaited lifecycle/transition hooks, action execution, normalized terminal failures, coherent readonly state snapshots, and terminal idempotent disposal.
- Retained builder aliases and isolated the old mutable `TourStore` conversion in a clearly marked transitional bridge for the later adapter migration.
- Added controller/definition tests covering readonly isolation, lifecycle/navigation, async errors, concurrency, stale resolution, target strategies, state updates, action execution, disabled navigation, directional skipping, view failures, disposal, and abort behavior.
- Corrected synchronous subscriber reentrancy so a notification-triggered run, cancel, or dispose invalidates the old operation before any later hook, callback, or mutation.
- Aligned `canPrevious` with `previous()` on the first step: it is available only when back navigation is enabled and cancellation is allowed.
- Unified abortable timers and removed their abort listeners on normal resolution and abort rejection.
- Moved readonly definition types, step-prop cloning/freezing, and workflow-definition creation into focused `packages/core/src/definition/` modules shared by the builder and active runtime.

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

- P1 runtime architecture, concurrency, cleanup, positioning, accessibility, and instance scoping.

## Remaining

- P1: runtime architecture, concurrency, cleanup, positioning, accessibility and instance scoping.
- P2: final public contracts, adapter acceptance suite, playground and documentation migration.
- P3: dead-code cleanup, MIT license, package metadata and final release rehearsal.

## Verification log

| Command | Result |
| --- | --- |
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

## Decisions and deviations

- `createGlowTour<T>()` is the only new public instance factory; `TourController` and `TourViewDriver` remain internal implementation types.
- Async commands reject after disposal with `Tour controller is disposed`; `updateCurrentStep` and repeated `dispose` are no-ops.
- Public definitions and state snapshots freeze nested mutable data/option arrays deeply enough for their supported value contracts; active observables remain internal.
- A resolver-originated `AbortError` is terminal unless the controller token/signal was actually invalidated; only stale controller-owned aborts are ignored.

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

- `package.json`, `bunfig.toml`, `tsconfig.json`, and `scripts/{build-packages,pack-packages,test-tarballs}.ts`
- `packages/*/package.json`, declaration build configs, `packages/angular/ng-package.json`, and explicit public entrypoints.
- `apps/playground/package.json`, `biome.json`, `.gitignore`, `bun.lock`, source-manifest contract tests, and the Styles CSS declaration.
- `.changeset/config.json`, `.github/workflows/{ci,changesets,release}.yml`, `scripts/{prepare-release,release-contract.test}.ts`, and root release scripts/dependencies.

## Recovery instructions

1. Open `.worktrees/audit-p0-release` (the worktree path is retained while the branch is now P1).
2. Confirm the current branch with `git status --short --branch`.
3. Continue the P1 core runtime task from the next action recorded above.
