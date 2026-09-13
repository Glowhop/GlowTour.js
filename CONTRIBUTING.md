# Contributing to GlowTour.js

Thanks for contributing to GlowTour.js.

## Before you start

- Search existing issues and pull requests before opening a new one.
- Keep changes focused. Unrelated refactors should be submitted separately.
- For larger API or behavior changes, open an issue first so the direction can be discussed before implementation.

## Development setup

GlowTour.js uses Bun workspaces. The repository currently targets Bun `1.3.12`.

```bash
bun install --frozen-lockfile
```

Useful commands:

```bash
bun run docs        # documentation website
bun run playground  # local playground
bun run test        # unit tests
bun run test:browser
bun run check
bun run typecheck
bun run build
```

## Before opening a pull request

Run the same core validations used by CI:

```bash
bun run check
bun run typecheck
bun run build
bun test
bun run test:browser
bun run pack
bun run test:tarballs
bun run --cwd apps/playground build
bun run --cwd apps/website build
```

If you change a public package in a way that should appear in release notes, add a Changeset:

```bash
bun run changeset
```

Choose the smallest appropriate release type and describe the user-visible change clearly.

## Pull requests

A pull request should:

- explain what changed and why
- stay limited to one logical change where practical
- include tests for behavior changes
- update documentation for public API or usage changes
- avoid committing generated build output unless the repository explicitly tracks it
- pass all required CI checks

Maintainers may ask for changes before merging. Contributions are accepted under the repository's MIT license.

## Bug reports

Useful bug reports include:

- the GlowTour.js package and version
- framework and framework version, when applicable
- browser/runtime information
- a minimal reproduction
- expected behavior
- actual behavior

For security vulnerabilities, follow [SECURITY.md](./SECURITY.md) instead of opening a public bug report.
