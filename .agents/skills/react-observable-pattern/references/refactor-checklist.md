# Refactor Checklist

## Decision Guide

- Let a parent subscribe only when the value changes structure: which child renders, whether a region exists, or which ids belong in a collection.
- A leaf should own the subscription when it is the first component that actually renders the value, label, badge, or visual state.
- For lists, let the parent subscribe to ids, order, or collection shape; let each item subscribe to its own entry.
- Passing a fully resolved observable value through components that do not render or branch on it is a smell.
- If a parent reads a value only to hand it to one child, move the subscription down and pass an `id`, key, or observable handle instead.
- If both parent and leaf could subscribe, keep the subscription in the leaf unless the parent must make a composition decision from that value.

## Strict Acceptance

- Observable instances are created once in a stable boundary through `useMemo`, a stable context value, or a singleton, never directly in the uncontrolled render path.
- A parent component does not subscribe to a whole collection if leaf components can subscribe per entry with `useEntry`.
- In collection UIs, the parent subscribes only to ids, order, or collection shape, and each item subscribes to its own entry or value.
- A child that renders entity data receives an `id`, key, index, or observable handle by default, not a fully resolved item object from the parent.
- `useChange` is not used to produce rendered JSX values.
- `useLazy` is not used for urgent interactive state such as controlled inputs unless a non-urgent rationale is stated in code or comments.
- Any `useValue` or `useEntry` accessor that captures props, local state, or configuration includes an explicit `deps` list.
- If stable ids exist, the pattern uses `ObservableList<ID>` for ordering and `ObservableMap<ID, Value>` for entity data instead of using list index as business identity.
