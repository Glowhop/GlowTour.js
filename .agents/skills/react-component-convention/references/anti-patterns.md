# Anti-Patterns

- Do not create `{{name}}.types.d.ts` before another file needs the type or the type becomes part of the public surface. Keep private types in `{{name}}.tsx` until sharing is real.

- Do not create `{{name}}.module.css` unless a component file imports it. A CSS module with no consumer is noise, not structure.

- Do not keep named regions such as `Header`, `Actions`, or `EmptyState` inline just because they are short. A stable UI name is enough to justify extraction.

- Do not leave repeated item markup in the parent when `components/` can isolate the repeated block. Repetition in the parent is usually a missed decomposition.

- Do not keep inline conditional branches when they represent a distinct UI state. Extract the branch when it makes the parent read like markup instead of orchestration.

- Do not move every type out of the main component file by default. Shared types belong in `{{name}}.types.d.ts`; local render details do not.
