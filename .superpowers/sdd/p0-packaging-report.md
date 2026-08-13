# P0 packaging report

Status: DONE

## Red/green smoke evidence

- Red: `bun scripts/test-tarballs.ts` exited 1 before implementation with `AssertionError: run bun run pack before bun run test:tarballs` because no tarball directory existed.
- Green: `bun run test:tarballs` exited 0 after implementation: `Tarball smoke contract passed for 7 packages.` The contract validates tarball manifests and contents, uses `npm install` in a temporary directory outside the Bun workspace, typechecks all seven consumer imports, and removes the directory in `finally`.

## Artifacts and manifest rules

- Core, React, Vue, Solid, and Vanilla emit browser-targeted ESM and declarations under their own `dist` directories via Bun build plus TypeScript declaration emit.
- Styles copies `default.css` to `packages/styles/dist/default.css`.
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

## Self-review and concerns

- `git diff --check` is clean. Generated `dist`, `.artifacts`, and playground output remain untracked and are excluded from Biome.
- No package was published.
- Vite reports a non-blocking Angular playground bundle size warning (about 1.38 MB minified). Code splitting is deferred because it changes application delivery behavior beyond P0 packaging.
- Commit: `1417dcc973c14396505ffde59465b005d7d1df86` (`build(packages): emit publishable distributions`).
