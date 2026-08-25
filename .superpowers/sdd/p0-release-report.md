# P0 release / CI report

## Status

Ready for the final P0 review. No package was published during this work.

The initial P0 workflow commit was `367d4ee` (`ci: add validation and npm release workflows`); this report records subsequent hardening findings without self-referencing a documentation commit.

## TDD evidence

- Red: `bun test scripts/release-contract.test.ts` initially produced 0 passes and 4 expected failures because `.changeset/config.json`, the CI workflow, release workflow, and release scripts did not exist.
- Green: release/config tests and focused helper tests now pass 13/13. They parse YAML rather than relying on string-only checks and verify canonical metadata, workflow triggers, permissions, full action pins, token absence, ancestry gate positioning, dynamic package-version rewriting, bumped-release validation, tarball content, publish ordering, skip/retry behavior, and offline dry-run behavior.

## Trusted action pins

Each value was verified with `git ls-remote` directly against the official upstream repository and is recorded with the matching tag comment in every workflow.

| Action | Upstream tag | Verified commit SHA |
| --- | --- | --- |
| `actions/checkout` | `v4.2.2` | `11bd71901bbe5b1630ceea73d27597364c9af683` |
| `oven-sh/setup-bun` | `v2.2.0` | `0c5077e51419868618aeaa5fe8019c62421857d6` |
| `actions/setup-node` | `v4.4.0` | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| `changesets/action` | `v2.1.0` | `198f833dd7d863100ea6e28967bc9a9fdefadb0a` |

## Workflows and release controls

- CI runs only for pull requests and pushes to `main`, with `contents: read` and cancellation of superseded ref runs.
- Changesets runs only on pushes to `main`; it creates or updates a version PR, has no publish script, and needs only repository-content and PR write scopes.
- Release runs only on a published GitHub Release. It checks out full Git history with `fetch-depth: 0` and `persist-credentials: false`, fails prereleases explicitly, accepts only a `vX.Y.Z` tag, then uses the testable ancestry helper to fetch `origin/main` and reject a release SHA outside its ancestry. It validates source and built manifests for all seven packages and reruns the complete validation suite before npm is contacted.
- npm trusted publishing runs on Node 22.14.0 after installing npm 11.5.1, with only `contents: read` and `id-token: write`. There is no `NPM_TOKEN`, `NODE_AUTH_TOKEN`, `registry-url`, or configured secret.
- Publish targets are verified `dist` directories, with public access, ordered Core, Styles, React, Vue, Angular, Solid, Vanilla. Before each publish, the script looks up the exact package/version: existing versions are skipped, E404 versions are published, and every other registry failure stops the job. A rerun therefore resumes safely after partial publication.
- `bun run release:prepare` is strictly a local `--dry-run`; it validates the seven source/built manifests and prints the order without npm network operations. `bun run release:publish -- --dry-run` likewise prints its order without a registry lookup or publish.
- All seven source manifests publish canonical repository metadata: `git+https://github.com/Glowhop/glow-tour.git` plus their `packages/<id>` directory. Generated manifests and tarballs are checked for the same value.
- `@glowhop/playground` remains a private validation-only app. Contract tests exclude it from fixed Changesets, all seven-package build/pack/release/tarball lists, and publishing; CI keeps its Vite build as a separate validation step.

## Verification

- `bun install --frozen-lockfile` — pass.
- `bun run check` — pass.
- `bun run typecheck` — pass.
- `bun test` — pass, including 13 P0 release-hardening tests.
- `bun run build` — pass, seven distributions.
- `bun run pack` — pass, seven local tarballs.
- `bun run test:tarballs` — pass, external Node/CSS/Angular smoke consumer; Vite bundles the installed stylesheet into a real CSS asset.
- `bun run --cwd apps/playground build` — pass. Vite retains the pre-existing Angular 1.38 MB chunk warning.
- `bun test scripts/release-contract.test.ts` — pass, 5 tests.
- `bun run release:prepare` — pass, non-publishing dry-run.
- `bun run release:publish -- --dry-run` — pass, no registry operation or publish.
- `bun test scripts/release-ancestry.test.ts` — pass; local bare-repository integration proves a non-tip ancestor of `main` passes with full history and a commit outside `main` fails.

## Self-review and concerns

- Workflow syntax is parsed by the local YAML-based contract test; `actionlint` is not installed in this repository, so GitHub Actions will provide the final platform-level workflow validation after merge.
- The Changesets version PR must be merged before a matching GitHub Release is created; otherwise the release manifest/tag guard intentionally fails.
- The Angular playground bundle-size warning remains outside P0 packaging/release scope.
- Before the first release, protect `v*` tags in GitHub and bootstrap npm trusted publishing for the exact GitHub repository and release workflow. These controls live in GitHub/npm administration and cannot be committed here.
- If publication stops after a partial success, repair the failure and rerun the same release. Exact version preflight skips already-published packages and proceeds with the remaining ordered set.
