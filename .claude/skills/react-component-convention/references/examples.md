# Examples

## Minimal

Use the minimal asset when the component has no shared public types, no dedicated styles, and no immediate need for decomposition.

```text
user-card/
  index.ts
  user-card.tsx
```

## Complete

Use the full asset when the component needs public types, custom styles, or an extracted subcomponent.

```text
user-card/
  index.ts
  user-card.tsx
  user-card.types.d.ts
  user-card.module.css
  components/
    header/
      index.ts
      header.tsx
```

## Before / After

### Before

```tsx
export default function UserCard() {
  return (
    <section>
      <header>...</header>
      <div>...</div>
      {isEmpty ? <div>No data</div> : <ul>{items.map(renderItem)}</ul>}
    </section>
  );
}
```

### After

```text
user-card/
  index.ts
  user-card.tsx
  components/
    header/
      index.ts
      header.tsx
    empty-state/
      index.ts
      empty-state.tsx
    item/
      index.ts
      item.tsx
```

The parent now orchestrates layout and branching, while named and repeated UI blocks live in `components/`.
