# Release process

Glow Tour is released only from a stable GitHub Release. Local commands build and validate release
artifacts, but they must not publish to npm.

## Versioning

Changesets keeps these seven packages in one fixed version group:

1. `@glowhop/core-tour`
2. `@glowhop/styles-tour`
3. `@glowhop/react-tour`
4. `@glowhop/vue-tour`
5. `@glowhop/angular-tour`
6. `@glowhop/solid-tour`
7. `@glowhop/vanilla-tour`

The private `@glowhop/playground` is ignored by Changesets and is never published.

## Validation

Before a release, CI runs the checks, typecheck, unit and browser tests, seven-package build and
pack steps, external tarball smoke tests, and the separate playground build. Release preparation
also verifies matching versions and internal dependencies.

## Publication

The release workflow accepts only a published, stable GitHub Release with a `vX.Y.Z` tag whose
commit is on `main`. It uses npm trusted publishing/OIDC with `id-token: write`; no permanent npm
token is required. Packages are published in the order listed above, and a rerun can resume after
packages already present in the registry.

Do not run a real `npm publish` locally. Use the repository's release preparation and publish
dry-run commands when inspecting the process.

If a published version is defective, deprecate that exact version in npm with a concise reason,
prepare a corrective Changeset, and publish a new patch release through the same stable GitHub
Release workflow. Never overwrite or reuse an existing npm version.
