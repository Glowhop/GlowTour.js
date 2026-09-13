# CLAUDE.md

GlowTour.js is a production cross-framework guided-tour library built as a Bun workspace monorepo.

Before making changes, read `AGENTS.md` and treat it as the project-wide source of truth for architecture, API design, testing, bundle-size policy, SSR validation, and release rules. This file only adds Claude-specific execution emphasis; it does not override `AGENTS.md`.

## Repository context

- Public packages: `packages/core`, `packages/react`, `packages/vue`, `packages/angular`, `packages/solid`, `packages/vanilla`, `packages/styles`.
- Reference UI: `apps/playground`.
- Documentation site: `apps/website`.
- SSR references: `apps/ssr-react` (Next.js), `apps/ssr-vue` (Nuxt), `apps/ssr-solid` (SolidStart).
- Package manager/task runner: Bun.
- Lint/format: Biome.
- Type checking: TypeScript.
- Releases: Changesets + GitHub Actions. Never publish npm packages manually.

## Working rules

- Read the relevant implementation and tests before editing.
- Keep changes scoped and follow existing patterns.
- Keep `packages/core` framework-agnostic and presentation-free.
- Do not add browser globals to SSR-sensitive core paths.
- Prefer recipes built from existing primitives over expanding the public API.
- Treat public API and package-export changes as compatibility-sensitive.
- Do not create or commit `.agents/`, `.claude/`, `.codex/`, or `.mcp.json`; those are local-only.

## Verification is mandatory

For behavioral changes under `packages/`, validation is not complete with unit tests alone.

1. Run the relevant automated tests while developing.
2. Before finishing, run the complete applicable repository validation described in `AGENTS.md` and confirm it actually passes.
3. Start `apps/playground` with `bun run playground` and test the changed package behavior in a real browser. The playground is the reference application for browser verification.
4. Check interactions, visible output, focus/keyboard behavior when relevant, and browser console errors.
5. If the change touches or could affect SSR/hydration/browser-global access, run all three SSR suites:

```bash
bun run --cwd apps/ssr-react test
bun run --cwd apps/ssr-vue test
bun run --cwd apps/ssr-solid test
```

Do not report a package change as fully verified if browser verification or required SSR coverage was skipped.

## Bundle-size rule

Respect the `gzipBudget` limits in `scripts/verify-bundles.ts`.

When a package exceeds its byte budget, do not raise the limit first. Investigate the regression and try to reduce the generated code through simplification, deduplication, tree-shaking, or narrower imports/exports. Re-measure after optimizing. Increase the budget only if the required behavior cannot reasonably be implemented within the current limit, keep the increase minimal, and document the reason.

Never increase a bundle budget only to make CI pass.

## Completion standard

A change is complete only when its relevant tests have fresh passing output, required package behavior has been checked in the browser through `apps/playground`, SSR changes pass all three SSR apps, and bundle-size constraints remain justified. If any required validation cannot be run, state exactly what remains unverified.
