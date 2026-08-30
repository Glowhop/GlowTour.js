# Step 3 — Progress journal

Branch: `codex/step-3-dx-theme`

## Scope

- Complete cross-framework developer experience and the scoped default theme.
- Verify tree-shaking, package documentation, tarball contracts, and release preparation.
- Do not version packages or publish.

## Decisions

- Theme content scrolls while the popover keeps `overflow: visible` to preserve the Core arrow.
- Angular APF is measured by `sideEffects: false` and an immutable FESM gzip budget because raw esbuild precedes the Angular linker.
- Vue build preserves modules for real downstream pruning.

## Completed checklist

- [x] Framework package entry points and package-specific documentation.
- [x] Scoped default theme and reduced-motion/interaction states.
- [x] Pure Vanilla main import and `/auto` registration contract.
- [x] Cross-framework tree-shaking and immutable bundle budgets.
- [x] Tarball README compilation and smoke validation.
- [x] Minor Changeset for `@glowhop/vanilla-tour` and `@glowhop/styles-tour`.
- [ ] Real reflow/zoom validation deferred to Step 4.
- [ ] Chromium/WebKit validation deferred to Step 4.

## Baseline

Step 3 started from merge base `c03e21f` (Step 2). The Step 2 journal records the 29 August baseline as:

- `bun run check` — pass, 113 files.
- `bun run typecheck` — pass.
- `bun test` — pass, 255 tests at final Step 2 validation.
- `bun run test:browser` — pass, 69 Happy DOM tests.

## Final validation

Fresh validation on 30 August 2026:

- `bun run check` — pass, 114 files.
- `bun run typecheck` — pass.
- `bun test` — pass, 276 tests.
- `bun run test:browser` — pass, 66 browser-contract tests.
- `bun run build` — pass, 7 packages built.
- `bun run pack` — pass, 7 tarballs created.
- `bun run test:tarballs` — pass, package contracts and all 9 gzip budgets validated.
- `bun run --cwd apps/playground build` — pass; the existing Angular chunk-size warning remains non-blocking.
- `bun run release:prepare` — pass.
- `bun run release:publish -- --dry-run` — pass; nothing was published.

The browser count changed from 69 to 66 because the Vanilla browser suite changed from 18 to 15 tests during Step 3; the other four framework suites retained their counts. The history shows disabled-state cases were consolidated/replaced in that suite. All 66 current tests pass; this count change is not treated as a test failure.

## Commits

- Implementation range: `c03e21f..732311d`.
- Initial traceability commit: `1db2171 docs: complete step 3 progress journal`.
- This journal correction is a subsequent documentation correction to that traceability commit; no implementation changes are included.

## Risks and deferrals

Real browser reflow/zoom behavior and Chromium/WebKit coverage remain explicit Step 4 work. No package versioning or publish was performed in Step 3.
