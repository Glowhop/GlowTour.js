# @glowhop/website

Marketing site + docs for Glow Tour, built with [Astro](https://astro.build), [Starlight](https://starlight.astro.build) for `/docs`, `@astrojs/react` for interactive hero demos, and Tailwind v4.

## Scripts

```bash
bun run --cwd apps/website dev      # start the dev server
bun run --cwd apps/website build    # static build to dist/
bun run --cwd apps/website preview  # preview the built site

# from the repo root:
bun run docs                        # same as the dev script above
```

## Structure

- `src/pages/` — marketing pages (`index.astro`, `react.astro`, `vue.astro`, `solid.astro`, `angular.astro`, `vanilla.astro`), using a custom `MarketingLayout`, not Starlight's layout.
- `src/content/docs/docs/` — Starlight documentation content. Nested one level under `docs/` so Starlight's routes resolve at `/docs/...` instead of the site root, leaving `/`, `/react`, etc. for the marketing pages above. See the comment in `astro.config.mjs` for why.
- `src/components/` — shared Astro/React components (`Button.astro`, `CodeBlock.astro`, `FrameworkPage.astro`, `HeroDemos.tsx`).
- `src/lib/` — static source snippets shown in code blocks, kept as plain strings so they render through Astro's `<Code>` (Shiki) without needing a bundler-level "raw file import".
- `src/styles/global.css` — Tailwind v4 entry point and the `@theme` tokens mirrored from `packages/styles/default.css` (accent, surface, text, border, radius, shadow), with a `prefers-color-scheme: dark` variant.

## Notes

- `astro build` produces a plain static `dist/` directory — no platform-specific config (no `vercel.json`, no `netlify.toml`). Deploy the output to any static host.
- Only the hero demos hydrate (`client:load` on `SingleStepDemo`, `MultiStepDemo`, `ProgrammaticDemo` from `HeroDemos.tsx`); framework pages show static, copyable code with no client JS.
