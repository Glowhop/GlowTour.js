# Step props refactor progress

## Goal

Implement the approved step-properties refactor on `codex/refactor-step-props` while preserving the current working tree changes.

## Progress

- [x] Create `codex/refactor-step-props` from the current branch.
- [x] Update Core public types and workflow definitions.
- [x] Implement effective dynamic presentation props and runtime updates.
- [x] Migrate framework adapters and playground usages.
- [x] Update package and tarball contract tests.
- [x] Run targeted and full verification.

## Notes

- The branch was created from `codex/fix-unfocus-unavailable-advance` after the sandbox approval.
- Existing uncommitted changes must remain untouched except where the refactor necessarily overlaps them.
- Core verification checkpoint: `bun test packages/core/src` passed with 214 tests and 0 failures.
- Dynamic overlay, indicator, controls, shortcuts, and animation options are coalesced on the existing animation-frame loop; focus and scroll remain entry-time behavior.
- Adapter unit checkpoint: 19 tests passed across React, Vue, Solid, Angular, and Vanilla.
- Browser checkpoint: 66 tests passed across the five adapters.
- Final checks passed: TypeScript, Biome, 7-package build, package packing, and the 7-package installed-tarball smoke contract.
- Full `bun test` result: 280 passed and 3 unrelated baseline style tests failed. The failures concern missing CSS rules in unmodified `packages/styles/default.css` and `apps/playground/src/styles.css`; this refactor does not change either file.
- Release metadata: `.changeset/refactor-step-props.md` records the six public package contract changes.
