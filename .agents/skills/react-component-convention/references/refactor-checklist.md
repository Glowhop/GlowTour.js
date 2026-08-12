# Refactor Checklist

## Decision Guide

- Keep a block inline when it is short, unnamed, and only supports the parent's layout.
- Create `components/` as soon as a block has a stable UI name, owns a conditional branch, repeats, or makes the parent read like markup instead of composition.
- A small named region still belongs in `components/`; size alone is not a reason to keep `Header`, `Actions`, or `EmptyState` inline.
- Keep types in `{{name}}.tsx` when they are used by that file only or describe private render details.
- Create `{{name}}.types.d.ts` when another file must import the type or when the type describes the component's public surface.
- If the case is ambiguous, extract the UI block but keep the type local until a second file actually needs it.

## Strict Acceptance

- The folder name is `kebab-case`, and the main file uses the exact same base name.
- The default-exported component name matches the PascalCase transform of the folder name.
- `index.ts` only re-exports the default component and optional public types through quoted relative imports.
- `{{name}}.types.d.ts` does not exist unless it is re-exported publicly or imported outside the main component file.
- `{{name}}.module.css` does not exist unless a component file actually imports it.
- If the parent contains repeated item markup, multiple named regions, or inline conditional UI branches, a `components/` split exists.
- The parent component reads primarily as composition and orchestration, not as the full render implementation.
