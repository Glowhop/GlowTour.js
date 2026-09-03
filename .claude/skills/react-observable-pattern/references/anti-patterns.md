# Anti-Patterns

- Do not recreate `Observable`, `ObservableList`, or `ObservableMap` instances during render. The React hooks expect stable references and will resubscribe when the observable instance changes.

- Do not subscribe to a whole `ObservableList` or `ObservableMap` in a parent when each child can subscribe to its own entry with `useEntry`. Use list-wide subscriptions for order or collection shape, not for every leaf value.

- Do not resolve every item value in the parent and pass the resolved data to children by default. Pass an `id`, key, index, or observable handle when the child is the component that actually renders that value.

- Do not model mutable business entities by list index when stable ids exist. Prefer `ObservableList<ID>` for ordering and `ObservableMap<ID, Value>` for entity data so entry subscriptions stay aligned with domain identity.

- Do not replace an entire list or map for a local single-entry update. Prefer `setEntry`, `addEntry`, or `removeEntry` when one entry changes so the subscription scope stays narrow.

- Do not use `useChange` to drive rendered JSX. `useChange` is for side effects and external integrations; use `useValue` or `useEntry` for values that appear in the render output.

- Do not use `useLazy` by default for urgent UI such as controlled inputs or immediate feedback. Keep `useLazy` for non-urgent or expensive projections where `startTransition` is intentional.

- Do not omit `deps` when the `accessor` closes over props, local state, or configuration. `useValue` and `useEntry` delegate accessor stability to the provided dependency list.

- Do not add a provider boundary when simple local state and props already solve the problem. This pattern is for shared feature state and controlled subscription granularity, not for every isolated component.

- Do not force simple mutations to travel through a chain of parent callbacks when the leaf already owns the relevant observable. Let the component closest to the interaction update the observable it renders when that keeps the data flow coherent.
