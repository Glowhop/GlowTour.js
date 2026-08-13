# P0 packaging report

Status: DONE

## Red/green smoke evidence

- Red: `bun scripts/test-tarballs.ts` exited 1 before implementation with `AssertionError: run bun run pack before bun run test:tarballs` because no tarball directory existed.
- Green: `bun run test:tarballs` exited 0 after implementation: `Tarball smoke contract passed for 7 packages.` The contract validates tarball manifests and contents, uses `npm install` in a temporary directory outside the Bun workspace, typechecks all seven consumer imports, and removes the directory in `finally`.
- Follow-up red: adding `node runtime-imports.mjs` before creating the fixture exited 1 with `MODULE_NOT_FOUND`, proving the execution assertion was active. The first strict CSS compilation then exited 2 because the published Styles tarball lacked a declaration export for `default.css`.
- Follow-up green: `bun run test:tarballs` exited 0 after adding the Styles CSS declaration/export. It now executes Core, React, Vue, Solid, and Vanilla entrypoints through Node package exports; resolves the stylesheet with `noUncheckedSideEffectImports`; and compiles a standalone Angular component against APF with `ngc`.

## Artifacts and manifest rules

- Core, React, Vue, Solid, and Vanilla emit browser-targeted ESM and declarations under their own `dist` directories via Bun build plus TypeScript declaration emit.
- Styles copies `default.css` to `packages/styles/dist/default.css`.
- Styles also publishes `default.css.d.ts` via the conditional CSS export so strict TypeScript consumers can resolve the side-effect import.
- Angular emits Angular 18 APF partial compilation through `ng-packagr` 18.2.1, including `fesm2022/glowhop-angular-tour.mjs`.
- Source package exports point only to conditional `dist` types/import artifacts. Build manifests are artifact-relative, `type: module`, retain `files: ["**/*"]`, carry side-effect metadata, remove development fields, and rewrite internal `workspace:*` references to `0.1.0`.
- All public package entrypoints now use explicit public exports rather than adapter/core wildcard re-exports.

## Dependencies added or adjusted

- Root dev: `@angular/compiler-cli@18.2.13`, `ng-packagr@18.2.1`, `typescript@5.5.4`.
- Angular runtime: `tslib`; Angular core/common peer and local development contracts at 18.2.
- React adapter: React 19 peer/dev dependency and React 19 dev types only; `@types/react` is not runtime.
- Vue and Solid framework packages are peer plus dev dependencies. The playground moves to React 19 to conform to the adapter peer contract.

## Exact verification results

| Command | Result |
| --- | --- |
| `bun install` | exit 0 |
| `bun run check` | exit 0; 82 files checked |
| `bun run typecheck` | exit 0 |
| `bun test` | exit 0; 62 pass, 0 fail |
| `bun run build` | exit 0; 7 publishable distributions built |
| `bun run pack` | exit 0; 7 local tarballs packed |
| `bun run test:tarballs` | exit 0; external npm consumer passed |
| `bun run --cwd apps/playground build` | exit 0 |
| `bun run test:tarballs` (follow-up) | exit 0; Node runtime entries, TS 5.7 strict CSS resolution, and Angular 18.2 `ngc` standalone consumer all passed |
| `bun run build` (follow-up) | exit 0; rebuilt all 7 distributions, including `default.css.d.ts` |
| `bun run pack` (follow-up) | exit 0; packed all 7 rebuilt local tarballs |
| `bun run check` (follow-up) | exit 0; 83 files checked with no fixes |
| `bun run typecheck` (follow-up) | exit 0; no diagnostics |
| `bun test` (follow-up) | exit 0; 62 pass, 0 fail |
| `bun run --cwd apps/playground build` (follow-up) | exit 0; Angular bundle-size warning only |

## Self-review and concerns

- `git diff --check` is clean. Generated `dist`, `.artifacts`, and playground output remain untracked and are excluded from Biome.
- No package was published.
- Vite reports a non-blocking Angular playground bundle size warning (about 1.38 MB minified). Code splitting is deferred because it changes application delivery behavior beyond P0 packaging.
- Functional packaging commit: `3deede7` (`build(packages): emit publishable distributions`).
- Functional smoke-test commit: `90079b6` (`test(packages): execute tarball consumer smoke tests`), with all final follow-up verification results recorded above.
- Current documentation commit records this completed state without self-referencing its own hash.
