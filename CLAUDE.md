# Glow Tour

Glow Tour is a cross-framework guided-tour library (core engine + React/Solid/Vue/Angular/vanilla adapters), managed as a Bun workspace monorepo. See [README.md](README.md) for the package layout and quick start.

## Working style

- Be pragmatic and concise. Explain important decisions and tradeoffs; do not pad simple choices into long narratives.
- Prefer the narrowest specialist subagent for a task over broad, unscoped work (see `.claude/agents/`). Use `default`'s routing logic as the mental model even when working directly: clarify intent, plan non-trivial work, implement with the matching domain owner.
- Keep direct implementation to trivial touch-ups; delegate everything else to the matching subagent.

## Repository conventions

- Package manager and task runner: Bun (`bun install --frozen-lockfile`, `bun test`, `bun run <script>`).
- Lint/format: Biome (`bun run check`, `bun run check:write`).
- Type checking: `bunx tsc -p tsconfig.json --noEmit`.
- `packages/core` has no presentation; framework adapters (`packages/react`, `packages/vue`, `packages/angular`, `packages/solid`, `packages/vanilla`) consume it. `packages/styles` provides the default theme.
- Changesets versions the public packages together; see [docs/release.md](docs/release.md) and [RELEASING.md](RELEASING.md).

## Verification before finishing

- Run the relevant subset of `bun run check`, `bunx tsc -p tsconfig.json --noEmit`, and `bun test` for anything touched.
- For UI-visible changes in an adapter, verify in a real browser (dev server or the `chrome-devtools`/`next-devtools` MCP tools) rather than relying on types and unit tests alone.
