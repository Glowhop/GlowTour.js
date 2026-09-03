# Examples

## Before / After

Use this transformation as the default mental model when refactoring a large React component toward this pattern.

### Before

Files:

- `big-component.tsx`

```tsx
export default function BigComponent() {
  const [name, setName] = useState("");
  const [data, setData] = useState<{ id: string; value: number }[]>([]);

  const onUpdate = (id: string, value: number) => {
    setData(newValues);
  };

  return (
    <div>
      <input value={name} onChange={(event) => setName(event.target.value)} />
      {data.map(({ id, value }) => (
        <div key={id}>{value}</div>
      ))}
    </div>
  );
}
```

Problems in this shape:

- one component owns both orchestration and subscriptions
- the whole list re-renders when one item changes
- mutation logic is pushed back up into the parent by default
- there is no stable observable boundary for the feature

### After

Files:

```text
big-component/
  provider.tsx
  name-component/
    index.ts
    name-component.tsx
  list-component/
    index.ts
    list-component.tsx
    components/
      item/
        index.ts
        item.tsx
```

`provider.tsx`

```tsx
import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  Observable,
  ObservableList,
  ObservableMap,
} from "glowhop/observables";

type ID = string;

interface BigContextType {
  name: Observable<string>;
  data: ObservableMap<ID, number>;
  ids: ObservableList<ID>;
}

const BigContext = createContext<BigContextType | null>(null);

export function useBigContext() {
  const context = useContext(BigContext);

  if (!context) {
    throw new Error("BigContext provider is missing");
  }

  return context;
}

interface Props {
  children: ReactNode;
}

export default function Provider({ children }: Props) {
  const value = useMemo(
    () => ({
      name: new Observable(""),
      data: new ObservableMap<ID, number>(new Map()),
      ids: new ObservableList<ID>([]),
    }),
    [],
  );

  return <BigContext.Provider value={value}>{children}</BigContext.Provider>;
}
```

`name-component/name-component.tsx`

```tsx
import { useValue } from "glowhop/react-observables";

import { useBigContext } from "../provider";

export default function NameComponent() {
  const { name } = useBigContext();

  const nameValue = useValue(name);
  const count = useValue(name, (value) => value.length);

  return (
    <div>
      <input
        value={nameValue}
        onChange={(event) => name.set(event.target.value)}
      />
      <p>{count}/10</p>
    </div>
  );
}
```

`list-component/list-component.tsx`

```tsx
import { useValue } from "glowhop/react-observables";

import { useBigContext } from "../provider";
import Item from "./components/item";

export default function ListComponent() {
  const { ids } = useBigContext();
  const order = useValue(ids);

  return (
    <div>
      {order.map((id) => (
        <Item key={id} itemId={id} />
      ))}
    </div>
  );
}
```

`list-component/components/item/item.tsx`

```tsx
import { useEntry } from "glowhop/react-observables";

import { useBigContext } from "../../../provider";

interface Props {
  itemId: string;
}

export default function Item({ itemId }: Props) {
  const { data } = useBigContext();
  const itemValue = useEntry(data, itemId);

  const onUpdate = (value: number) => {
    data.setEntry(itemId, value);
  };

  return (
    <div>
      <span>{itemValue}</span>
      <button type="button" onClick={() => onUpdate((itemValue ?? 0) + 1)}>
        Increment
      </button>
    </div>
  );
}
```

Key change:

- the provider owns stable observables
- `NameComponent` subscribes only to `name`
- `ListComponent` subscribes only to ordering
- `Item` subscribes only to its own entry and can mutate it locally
