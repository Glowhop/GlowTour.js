---
name: react-observable-pattern
description: Use this skill when creating or refactoring a React feature that uses Glowhop observables and react-observables to keep subscriptions at the lowest necessary UI level, usually on top of the react-component-convention folder structure.
---

# React Observable Pattern

Use this skill for React features that should minimize re-renders by pushing reactive subscriptions as low as possible in the component tree.

This skill complements `react-component-convention`. Reuse that folder-per-component structure, then apply the observable rules below.

## Apply Together With `react-component-convention`

When this skill is used alongside `react-component-convention`, the following rules are reused unchanged and remain mandatory:

- Produce a component folder, not a standalone file.
- `index.ts` always re-exports the default component and any public types.
- `components/` is used early and aggressively.

Relevant libraries:

- [Glowhop observables](https://github.com/Glowhop/observables)
- [Glowhop react-observables](https://github.com/Glowhop/react-observables)

Treat the examples in this skill as pattern guidance, not as an API contract to copy blindly.

## Outcome

Produce a feature or subtree with:

- a stable provider/context boundary for observable state
- composition-oriented parent components
- subscriptions placed only where the rendered value is actually needed
- list parents that read ordering or ids
- item leaves that subscribe to their own entry or value

## Core Rule

Subscribe at the lowest possible level, and only at the level that truly needs the value.

Do not pull observable values high in the tree just because they are easy to access there.

## When Not To Use

Do not use this pattern when the component is simple and does not share multiple pieces of state with other components.
Prefer straightforward local state and props when they already solve the problem cleanly instead of introducing unnecessary provider and observable structure.

## Workflow

1. Identify the feature boundary that owns the observable state.
2. Create a stable provider/context for that boundary.
3. Expose a dedicated context hook such as `useBigContext()`.
4. Keep parent components focused on layout, composition, and wiring.
5. Use `useValue`, `useEntry`, or the closest reactive hook only in the component that renders the subscribed value.
6. Extract subcomponents early using `react-component-convention` so the subscription can move down with the UI block.

## Hard Rules

### Provider Boundary

- Create observables once inside a stable provider value, not during every render.
- The provider is the source-of-truth boundary for the feature.
- `provider.tsx` is the default example name, but the important rule is the stable provider/context pattern, not the filename itself.
- Expose a dedicated context hook that throws if the provider is missing.

### Subscriptions

- Read the raw observable container from context as high as needed.
- Read the reactive value from that container as low as possible.
- Only subscribe in a parent when the parent itself needs the derived value to decide structure or composition.
- Prefer local derived values at the subscription site instead of computing them high in the tree and passing them down.

### Lists and Maps

- A list component can subscribe to ordering, ids, or collection shape.
- An item component should subscribe to its own entry or value instead of receiving the full resolved data from the parent.
- Avoid designs where a whole list re-renders because one item value changed.

### Mutations

- Mutation handlers should update the observable they own as close as possible to the component that triggers the interaction.
- Do not bounce simple updates through unnecessary parent callbacks when a local leaf can safely update the observable directly.

### Structure

- Reuse the directory conventions from `react-component-convention`.
- Keep feature children in component folders with `index.ts` entrypoints.
- Extract named UI regions or repeated blocks early so subscriptions can live inside the leaf component that needs them.

## Template

Use the bundled feature example in `assets/feature-template/`.

It demonstrates:

- a provider with stable observable instances
- a dedicated `useBigContext()` hook
- a simple component subscribing to a scalar observable
- a list component subscribing only to ids
- an item component subscribing to its own map entry

Adapt import paths and exact hook signatures to the installed versions of the Glowhop packages in the target project.

## Acceptance Check

Before finishing, verify all of the following:

- The output still respects `react-component-convention`.
- Observable instances are created once in a stable provider boundary.
- Parent components mostly orchestrate and compose.
- Subscriptions happen at the lowest level that renders the value.
- A collection parent does not subscribe to every item value unnecessarily.
- Leaf components own the subscriptions and mutations for the values they display.

## References

- Read `references/anti-patterns.md` to avoid high-level subscriptions, unstable observable references, and the wrong hook choices.
- Read `references/refactor-checklist.md` for parent vs leaf decisions and strict review criteria.
- Read `references/examples.md` for the provider/list/item refactor shape and concrete before/after examples.
