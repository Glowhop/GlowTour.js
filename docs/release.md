# Release policy

This document records the versioning policy of GlowTour.js. The release procedure itself
(Changesets, version PR, GitHub Release, npm trusted publishing, recovery from a defective
version) is described once, in [`RELEASING.md`](../RELEASING.md).

GlowTour.js is released only from a stable GitHub Release. Local commands build and validate release
artifacts, but they must not publish to npm.

## Versioning policy

Changesets keeps the seven public packages in one fixed version group: a release always gives them
the same version. The private apps are never published.

The public API of every package entry point is recorded under `api/`, generated from the sources
with `bun run api:report`. `bun test` fails when the committed reports and the sources disagree, so
every public API change shows up in review as a diff under `api/`.

- Adding an export, an option, or a member to a union such as `TourEventType`, `TourStatus`, or
  `TourEventSource` is a minor change. Code that switches over these unions must keep a default
  branch.
- The 1.4 API overhaul removes and renames public API in a minor release, without deprecation.
  After 1.4.0, removing or renaming an export, an option, a component, or a union member requires
  a major release.

## Documentation of an unreleased version

The website and the READMEs are built from `main`, so they can describe a version that npm does not
have yet. Until that version is published, say so in one form only: "the upcoming 1.4". The
migration guide and the getting started page carry that note. Remove every such marker in the
version PR that releases it.
