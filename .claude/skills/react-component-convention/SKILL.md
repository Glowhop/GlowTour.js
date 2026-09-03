---
name: react-component-convention
description: Use this skill when creating, refactoring, or restructuring React components that must follow a strict folder-per-component convention with kebab-case files, PascalCase component names, an index.ts barrel, optional .types.d.ts and .module.css files, and aggressive extraction into subcomponents.
---

# React Component Convention

Use this skill for any request to create, refactor, or standardize a React component with the repository's folder-based convention.

## Outcome

Produce a component folder, not a standalone file.

- Folder and file names use `kebab-case`.
- The exported React component uses `PascalCase`.
- `index.ts` always re-exports the default component and any public types.
- `{{name}}.types.d.ts` exists only when types must be shared outside the main file.
- `{{name}}.module.css` exists only when the component owns custom styles.
- `components/` is used early and aggressively.

`{{name}}` is the kebab-case component name. `{{pascalName}}` is the same name in PascalCase, for example `user-card` -> `UserCard`.

## When Not To Use

Do not apply this pattern to framework-level files such as pages, layouts, or other routing primitives.
Use it for reusable or compositional React UI components, not application entrypoints or framework boundaries.

## Workflow

1. Identify the public responsibility of the component and name it in `kebab-case`.
2. Create the component as a directory with at least `index.ts` and `{{name}}.tsx`.
3. Decide immediately whether any block should be extracted into `components/` before filling in the parent render.
4. Add `{{name}}.types.d.ts` only if a type must be imported elsewhere.
5. Add `{{name}}.module.css` only if the component owns custom styles.
6. Keep the parent component focused on composition, data flow, and orchestration.

## Hard Rules

### Naming

- Directory name: `{{name}}/`
- Main file: `{{name}}.tsx`
- Shared types file: `{{name}}.types.d.ts`
- CSS module: `{{name}}.module.css`
- Public component symbol: `{{pascalName}}`
- Props interface name: always `Props`

### Exports

Always create `index.ts`.

```ts
export { default } from "./{{name}}";
export type * from "./{{name}}.types";
```

If there are no public shared types, omit the second line and do not create `{{name}}.types.d.ts`.

### Types

- Keep local-only types in `{{name}}.tsx`.
- Create `{{name}}.types.d.ts` only for types consumed outside the main component file.
- Import shared types with `import type { ... } from "./{{name}}.types";`.

### Styles

- Do not create a CSS module by default.
- Create `{{name}}.module.css` only when the component has custom styles not already handled elsewhere.
- Import the CSS module only when the file exists.

### Decomposition

- Extract subcomponents early, not as a cleanup pass.
- Move code into `components/` as soon as you see a named region, a conditional block, a repeated block, or a semantically distinct UI block.
- The parent component should read like composition code, not like a long render template.

### Refactors

- Keep the public folder entrypoint stable.
- Preserve the public component name.
- Extract render-heavy sections into `components/`.
- Leave only orchestration, props wiring, and high-level layout in the parent.

## Templates

Use the bundled assets as the starting point:

- Full example with shared types, CSS module, and a subcomponent: `assets/component-template/`
- Minimal example with only `index.ts` and `{{name}}.tsx`: `assets/component-template-minimal/`

Choose the minimal template when the component does not need shared types, custom styles, or immediate decomposition. Choose the full template when any of those concerns are present.

## Acceptance Check

Before finishing, verify all of the following:

- The folder is in `kebab-case`.
- The exported component is in `PascalCase`.
- `index.ts` is valid and uses quoted relative imports.
- `{{name}}.types.d.ts` is present only if types are shared externally.
- `{{name}}.module.css` is present only if custom styles exist.
- Any distinct UI block has been considered for extraction into `components/`.

## References

- Read `references/anti-patterns.md` when deciding what not to generate or what should be extracted earlier.
- Read `references/refactor-checklist.md` for edge-case decisions and strict review criteria.
- Read `references/examples.md` for concrete minimal, complete, and refactor examples.
