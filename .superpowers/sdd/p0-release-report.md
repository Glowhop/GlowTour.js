# P0 release / CI report

## Status

Ready for the final P0 review. No package was published during this work.

Commit: `ci: add validation and npm release workflows`.

## TDD evidence

- Red: `bun test scripts/release-contract.test.ts` initially produced 0 passes and 4 expected failures because `.changeset/config.json`, the CI workflow, release workflow, and release scripts did not exist.
- Green: the same test now passes 5/5. It parses YAML rather than relying on string-only checks and verifies workflow triggers, permissions, full action pins, Changesets settings, token absence, validation gates, release guard, and the exact publish order.

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
- Release runs only on a published GitHub Release. It fails prereleases explicitly, accepts only a `vX.Y.Z` tag, validates source and built manifests for all seven packages, and reruns the complete validation suite before npm is contacted.
- npm trusted publishing runs on Node 22.14.0 after installing npm 11.5.1, with only `contents: read` and `id-token: write`. There is no `NPM_TOKEN`, `NODE_AUTH_TOKEN`, `registry-url`, or configured secret.
- Publish targets are verified `dist` directories, with public access, ordered Core, Styles, React, Vue, Angular, Solid, Vanilla.
- `bun run release:prepare` is strictly a local `--dry-run`; it validates the seven source/built manifests and prints the order without npm network operations.

## Verification

- `bun install --frozen-lockfile` — pass.
- `bun run check` — pass.
- `bun run typecheck` — pass.
- `bun test` — pass, 67 tests.
- `bun run build` — pass, seven distributions.
- `bun run pack` — pass, seven local tarballs.
- `bun run test:tarballs` — pass, external Node/CSS/Angular smoke consumer.
- `bun run --cwd apps/playground build` — pass. Vite retains the pre-existing Angular 1.38 MB chunk warning.
- `bun test scripts/release-contract.test.ts` — pass, 5 tests.
- `bun run release:prepare` — pass, non-publishing dry-run.

## Self-review and concerns

- Workflow syntax is parsed by the local YAML-based contract test; `actionlint` is not installed in this repository, so GitHub Actions will provide the final platform-level workflow validation after merge.
- The Changesets version PR must be merged before a matching GitHub Release is created; otherwise the release manifest/tag guard intentionally fails.
- The Angular playground bundle-size warning remains outside P0 packaging/release scope.
