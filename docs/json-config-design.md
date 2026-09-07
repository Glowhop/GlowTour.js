# JSON-serializable tour config: type design

Status: **implemented**. `packages/core/src/config/{types,validate,from-config}.ts` are real,
tested code, exposed through the `@glowhop/core-tour/config` entry point.

## Format

A `WorkflowConfig<T = string>` is a plain JSON object: a `name`, the usual tour-level
display/behavior options, and `steps`. Content (`title`/`content`) is generic over `T`, defaulting
to `string` for the untrusted-JSON path (`JSON.parse()` output). No i18n either way; put
translation keys in `content` and interpolation params in `data`. `target` is a CSS selector
string only.

`T` exists because `createWorkflowFromConfig` returns a `WorkflowDefinition<T>`, and
`WorkflowDefinition<T>` is invariant in `T` (step props use `T` covariantly, `StartOptions<T>`'s
lifecycle hooks use it contravariantly). A non-generic, `string`-only format would produce
`WorkflowDefinition<string>`, which is neither assignable to nor from `WorkflowDefinition<ReactNode>`
— even though `string` is a valid `ReactNode` — locking every framework adapter out of the config
path (see decision #3 in `HANDOFF-serializable-config.md`). Instantiating with the adapter's
content type (`createWorkflowFromConfig<ReactNode>(...)`) fixes this with no cast.

Runtime validation of `title`/`content` cannot know what `T` is, so it stays strict by default —
plain strings only — regardless of the type parameter. Pass `options.validateContent` (see
"Validating a generic `T`" below) to accept `T`'s actual shape.

`actions` (per step) and `eventHandlers[].action` accept a `StepActionRef`: either a `BuiltinAction`
object or an inline function (same-runtime JS only, not serializable). `advanceAction`/
`previousAction`/`cancelAction` and the tour-level `onStart`/`onCancel`/`onFinish` hooks accept only
a plain function — see "Mapping problems" below for why.

```jsonc
{
  "name": "onboarding",
  "cancellable": true,
  "steps": [
    {
      "target": "#invite-button",
      "title": "onboarding.invite.title",
      "content": "onboarding.invite.body",
      "data": { "seatsRemaining": 3 },
      "actions": [
        { "type": "waitUntilElement", "selector": "#invite-button", "timeout": 5000 },
        { "type": "clickTarget" }
      ],
      "eventHandlers": [
        {
          "event": "click",
          "action": { "type": "focusTarget" }
        }
      ]
    },
    {
      "target": "#done-banner",
      "title": "onboarding.done.title",
      "content": "onboarding.done.body",
      "actions": [{ "type": "wait", "ms": 400 }]
    }
  ]
}
```

A hand-authored config with no functions at all is 100% JSON — `BuiltinAction` alone covers
delays, waiting for an element, and clicking/focusing the target, which is the bulk of real tours.
`advanceAction`/`previousAction`/`cancelAction` and the lifecycle hooks require JS (see below), so a
config using them is a same-runtime JS object, not a wire-transportable JSON document.

## Entry-point / bundle wiring

The core package is `@glowhop/core-tour`. It already ships a second, narrower entry point
(`./adapter`) for exactly this reason — SSR/hydration-only consumers shouldn't pay for the
builder — so `./config` follows the same, already-established pattern:

- **`packages/core/package.json`**: an `"./config"` key in `exports`, pointing at
  `./dist/config/index.{js,d.ts}` (mirrors `./adapter`).
- **`scripts/build-packages.ts`**: `"src/config/index.ts"` in the `core` package's `entrypoints`
  list, so it gets its own tree-shaken bundle via the same synthetic-wrapper build path already
  used for `src/adapter.ts`.
- **`tsconfig.json`** (root): a `@glowhop/core-tour/config` path alias alongside the existing
  `@glowhop/core-tour` / `@glowhop/core-tour/adapter` ones.
- **`scripts/verify-bundles.ts`**: a `BundleScenario` entry ("Core config") with its own gzip
  budget, so the config module's bundle size is tracked the same way as every other entry point.

## Mapping problems (resolved)

These are places where the config format cannot cleanly mirror the builder API. Earlier drafts of
this design used a caller-supplied `ActionRegistry` (a lookup from string id to function) as an
escape hatch for exactly these cases. **The registry has been removed entirely** — there is no
string-id form of `ActionRef` anywhere in the format. The remaining gaps are accepted tradeoffs,
not deferred problems:

1. **`BuiltinAction` only makes sense for `actions[]` / `eventHandlers[].action`.**
   `wait`/`waitUntilElement`/`clickTarget`/`focusTarget` all assume a `StepContext`-shaped context
   (`target: HTMLElement`, `signal`, navigation methods) — which is what `actions[]` and
   `eventHandlers[].action` get (`StepEventContext<T>` is literally `StepContext<T>`). But
   `advanceAction`/`previousAction`/`cancelAction` receive a `BeforeActionStepContext` (`target`
   only, no `signal`, no navigation) and `onStart`/`onCancel`/`onFinish` receive a
   `LifecycleHookContext` (**no `target` at all** — only `step: TourCurrentStep<T> | null`).

   Resolved by **splitting `ActionRef` per slot family** instead of keeping one generic union, each
   generic over the config's content type `T`:
   - `StepActionRef<T> = BuiltinAction | StepAction<T>` — for `actions[]` and
     `eventHandlers[].action`.
   - `TransitionActionRef<T> = StepTransitionAction<T>` — for
     `advanceAction`/`previousAction`/`cancelAction`. Plain function type, no builtin variant.
   - `LifecycleActionRef<T> = (context: LifecycleHookContext<T>) => void | Promise<void>`
     — for `onStart`/`onCancel`/`onFinish`. Plain function type, no builtin variant.

   TypeScript now rejects a `BuiltinAction` in a transition or lifecycle slot at compile time; the
   validator rejects it at runtime for raw (untyped) JSON input.

2. **Transition and lifecycle hooks are not expressible in JSON at all.** With the registry gone,
   `TransitionActionRef` and `LifecycleActionRef` collapse to plain function types — there is no
   JSON-object form for either, and there never will be one without reintroducing a registry
   (which was removed for a different reason — see point 3). **This is an accepted limitation**: a
   config that uses `advanceAction`/`previousAction`/`cancelAction`/`onStart`/`onCancel`/`onFinish`
   is not wire-transportable JSON. The documented workaround (see `docs/json-config.md`) is to bind
   app-side behavior through the `data` field's ids instead: an `eventHandlers[].action` (or
   `actions[]`) builtin/function can call `context.props.get().data` to look up state, but the
   transition/lifecycle decision itself still has to live in the same-runtime JS object.

3. **No registry, therefore no `waitUntil`.** The builder's `.waitUntil(predicate, options)` takes
   an arbitrary function; there is no way to reference one from JSON without a registry. Since the
   registry was dropped, the `waitUntil` builtin variant was dropped with it —
   `{ "type": "waitUntilElement" }` covers the common case (wait for a condition, specifically an
   element's presence) without needing an arbitrary predicate. `.waitUntil()` remains available on
   the JS builder for callers not using the JSON config path.

4. **Aggregated vs. fail-fast validation is a deliberate style break.**
   `packages/core/src/options/validation.ts` throws a `TypeError` on the first bad field.
   `validate.ts`'s helpers instead all push into a shared `issues: ConfigValidationIssue[]` array,
   and `validateWorkflowConfig` throws one `ConfigValidationError` (carrying every issue) at the
   end. Splitting "structural errors fail fast, everything else aggregates" seemed like a worse
   experience for someone editing a hand-written or generated JSON document — a spelling mistake in
   one field shouldn't hide a missing field three levels down.

5. **`onTargetEvent`'s multi-event overload has no clean single-shape config equivalent.**
   The builder accepts one event name, an array of names, or a custom event name, all bound to one
   callback. `EventHandlerConfig.event` is typed `string | readonly string[]` to cover the first
   two; `createWorkflowFromConfig` registers the resolved action once per event name (a loop over
   `step.onTargetEvent(event, callback)`), which is behaviorally identical to the builder's own
   array handling. A custom `Event` subtype's payload can't be expressed in JSON anyway (the
   callback only ever receives a plain DOM `Event` when resolved from config), so this is a soft
   loss of generality versus the builder's overloaded, type-narrowed `TEvent`.

6. **`source` on the returned definition is additive, not part of `WorkflowDefinition<T>`.**
   The original config is attached for a future exporter, but `WorkflowDefinition<T>` itself (in
   `packages/core/src/definition/types.ts`) has no such field and this module doesn't touch it.
   `WorkflowDefinitionFromConfig<T>` is declared as `WorkflowDefinition<T> & { source }` (via
   `interface ... extends`), so it stays assignable anywhere a plain `WorkflowDefinition<T>` is
   expected (e.g. `GlowTour<T>.run()`), and `.source` is only visible to code that imports from
   `@glowhop/core-tour/config` specifically. `source` contains a recursively frozen copy of the
   config containers, not the caller's own objects, so the config stays reusable and editable to
   build a variant. Rich `title`/`content` values, functions, and non-plain framework objects are
   carried over by reference: cloning or freezing them could discard prototypes, break internal
   slots, or recurse through cycles.

7. **Validating a generic `T`.** `validateWorkflowConfig`/`createWorkflowFromConfig` cannot know at
   runtime what `T` is, so the default `title`/`content` check stays a strict `typeof === "string"`
   — this matters most for the default `T = string` case, which is exactly the untrusted-JSON path
   where silently accepting non-strings would be a regression. Callers instantiating with a richer
   `T` (an adapter's content type) pass `options.validateContent?: (value: unknown, path: string) =>
   string | null` — returning an error message, or `null` when the value is acceptable — instead of
   a boolean flag like `allowRichContent`, since the callback also lets a caller assert more than
   "not a string" (e.g. "must be a string or a plain object with a `type` field").

## Files

- `packages/core/src/config/types.ts` — `WorkflowConfig`, `StepConfig`, `BuiltinAction`,
  `StepActionRef`, `TransitionActionRef`, `LifecycleActionRef`, `EventHandlerConfig`,
  `ConfigValidationIssue`, `ConfigValidationError`, `WorkflowDefinitionFromConfig`.
- `packages/core/src/config/validate.ts` — `validateWorkflowConfig` plus private
  `validate*Shape`/`assertNoUnknownKeys` helpers.
- `packages/core/src/config/from-config.ts` — `createWorkflowFromConfig` plus private
  `applyStepConfig`/`applyStepActionRef`/`applyBuiltinAction`/`applyEventHandler`/
  `resolveEventHandlerAction`/`deepFreeze` helpers.
- `packages/core/src/config/index.ts` — barrel, exported via the `@glowhop/core-tour/config` entry
  point.
- `packages/core/src/config/validate.test.ts`, `packages/core/src/config/from-config.test.ts` —
  tests.
- `docs/json-config.md` — user-facing format and usage doc.
