# AGENTS.md

GlowTour.js is a production cross-framework guided-tour library managed as a Bun workspace monorepo. The public packages are `packages/core`, `packages/react`, `packages/vue`, `packages/angular`, `packages/solid`, `packages/vanilla`, and `packages/styles`. Reference applications live in `apps/`: `playground`, `website`, `ssr-react`, `ssr-vue`, and `ssr-solid`.

These instructions apply to any coding agent working in this repository.

## Project boundaries

- `packages/core` owns workflow state, positioning, DOM behavior, and framework-agnostic primitives. It must not own presentation or hardcode browser globals such as `window`, `document`, `location`, or storage APIs in code paths that would break SSR.
- Framework-specific rendering and lifecycle integration belong in the corresponding adapter package.
- `packages/styles` owns the default CSS theme and design tokens.
- Keep behavior consistent across adapters unless a framework requires a documented exception.
- Public API compatibility matters: GlowTour.js is already published and used as a library. Treat public API changes as potentially breaking.
- npm publication happens through GitHub Actions. Never publish packages manually.

## Before changing code

- Read the relevant package, its tests, and nearby conventions before editing.
- Prefer the smallest change that solves the actual problem. Do not introduce speculative abstractions or unrelated refactors.
- Reuse existing primitives and contracts before adding new public API.
- If behavior, public API, SSR semantics, accessibility, or package exports could change, identify that impact explicitly before implementation.

## API design: recipe before feature

The project favors flexibility and DX by keeping the public API small.

- Before adding public API, verify that consumers cannot already express the behavior from existing primitives in a few lines. If they can, document a recipe instead of adding another option.
- Core should expose primitives; application policy stays in the application. Storage, routing, analytics, i18n, TTL, and multi-tab policy should not be absorbed into core without strong repeated evidence.
- Do not provide two public ways to solve the same problem without a compelling reason.
- Prefer a clear required contract over optional fields that create parallel behavior modes.
- Adding API later is additive; removing API later is breaking. When uncertain, prefer not to expand the public surface.
- Keep documentation claims strictly aligned with behavior that the library actually implements and tests.
- Record important rejected API directions and their rationale in `docs/` so the same decision does not have to be rediscovered later.

## Implementation rules

- Preserve TypeScript type safety and explicit boundaries.
- Keep tree-shaking in mind when changing exports or package entry points.
- Preserve accessibility behavior: focus management, keyboard handling, ARIA semantics, and restoration are product requirements, not optional polish.
- Do not introduce runtime dependencies casually. The core is intentionally dependency-free at runtime.
- Do not hide browser-only behavior behind types alone. Validate actual runtime behavior.
- Changes that affect users or published packages need an appropriate Changeset unless the repository conventions clearly classify them as documentation/internal-only work.

## Required validation

Validation is part of the implementation. Do not report a package change as complete until the relevant checks have actually passed.

### Automated checks

For package changes, run the complete repository validation unless the task is explicitly limited to documentation or non-runtime repository metadata:

```bash
bun install --frozen-lockfile
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

Run targeted tests while iterating, but targeted tests do not replace the full relevant validation before completion. Never claim that tests pass from inspection alone; use fresh command output.

### Browser validation: mandatory for package changes

Any behavioral modification under `packages/` must be exercised in a real browser. `apps/playground` is the reference application for package behavior.

- Start it with `bun run playground`.
- Exercise the changed behavior through the relevant framework example in the browser.
- Check the user-visible result, interactions, focus/keyboard behavior when relevant, and browser console errors.
- Do not consider unit tests, type checking, or a successful build a substitute for this browser validation.
- If browser validation cannot be performed in the current environment, state that explicitly and do not describe the change as fully verified.

### SSR validation: all three apps

If a change can affect SSR, hydration, browser-global access, package exports used during SSR, or adapter initialization, validate all three SSR reference apps, not only the adapter directly touched:

```bash
bun run --cwd apps/ssr-react test
bun run --cwd apps/ssr-vue test
bun run --cwd apps/ssr-solid test
```

A change affecting SSR is not considered validated until React/Next.js, Vue/Nuxt, and SolidStart coverage all pass.

### Bundle-size budgets

Bundle-size limits are intentional constraints. They are defined by `gzipBudget` scenarios in `scripts/verify-bundles.ts` and validated by the repository tests/tarball checks.

If a package exceeds its byte budget after a change:

1. Treat the increase as a regression to investigate first, not as a signal to immediately raise the budget.
2. Identify what added bytes and try to reduce them through simpler code, better factoring, tree-shaking, narrower imports/exports, or removal of duplicated/unnecessary logic.
3. Re-run the bundle measurement after optimization attempts.
4. Increase the relevant `gzipBudget` only when the added behavior is genuinely required and there is no reasonable code optimization left.
5. When a budget must increase, keep the increase as small as possible and document why the additional bytes are justified.

Never raise a bundle-size limit merely to make CI green.

## Bug fixes

- Establish the root cause before fixing when feasible.
- Add or update a regression test that fails for the original bug and passes with the fix when the behavior is testable automatically.
- Verify the actual user path in `apps/playground` for package behavior, even when the regression test passes.
- If the bug concerns SSR, also run all three SSR app tests.

## Scope and safety

- Do not invent requirements or silently broaden the task.
- Do not overwrite or revert unrelated user changes.
- Do not commit local agent/tool configuration. `.agents/`, `.claude/`, `.codex/`, and `.mcp.json` are local-only and ignored.
- Keep generated artifacts and local caches out of the repository.
- State any validation that could not be performed.

## Release context

Changesets version the public packages together. Read `docs/release.md` and `RELEASING.md` before changing release behavior. A GitHub Release triggers the npm publishing workflow; publishing is never a local/manual step.
