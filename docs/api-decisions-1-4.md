# API decisions for 1.4

GlowTour.js 1.4 reshapes the public API before the versioning policy in `release.md` locks it. This
page records the directions that were considered and rejected, and why, so they do not have to be
rediscovered. The user-facing changes are listed in the migration guide
(`apps/website/src/content/docs/docs/migration/1-4.md`).

## Release as 1.4, without deprecation

- **Chosen:** a minor release. Old names are removed outright; every removal is listed in a
  "Breaking changes" section of its changeset and in the migration guide.
- **Rejected:** a 2.0 major version published through a `next` prerelease channel, and keeping
  deprecated aliases for a transition period.
- **Why:** aliases would double the documented surface and add bytes to every bundle, and the
  release tooling only publishes stable versions from `main`. After 1.4, removals and renames go
  through a major version, as `release.md` states.

## Behavior in the dynamic step props

- **Chosen:** `behavior` is a step prop. `context.props.update({ behavior })` changes it during the
  step, it is validated, kept across visits, and visible in `state.currentStep.currentProps`.
- **Rejected:** a dedicated setter such as `context.setAllowInteraction(allowed)`.
- **Why:** the boundary between dynamic props and frozen behavior was arbitrary. A setter per field
  would have grown with every behavior option, while one store gives every field the same
  lifecycle.

## Steps designated by id

- **Chosen:** `tour.goTo(id)` and `context.goTo(id)`.
- **Rejected:** keeping `goToStep(index)`, or a `goTo(index | id)` overload.
- **Why:** everything else addresses steps by id (`startAt`, events, resuming). An index breaks as
  soon as steps are reordered or inserted, and an overload would keep that failure mode available.

## One state per control

- **Chosen:** a `state` per command, `"enabled"` or `"disabled"`. A disabled command is blocked
  everywhere the tour UI offers it: its button is disabled, its keys and `overlayClick` do nothing.
  Hiding a button is a styling recipe: a class through `classNames` and a `display: none` rule.
- **Rejected:** the `hide*Button`, `disable*Button` and `hideFooter` booleans; a third `"hidden"`
  state that removed the button and blocked the command like `"disabled"`.
- **Why:** the booleans allowed contradictory combinations, a hidden button kept its keyboard
  shortcut, and the cancel button had no equivalent. A `"hidden"` state read as a button
  appearance while it also blocked the keys and `overlayClick`, so `overlayClick: "cancel"` next
  to a hidden cancel control silently did nothing. It also made "no button, but Escape still
  cancels" impossible to express. With `state` limited to availability and the look left to
  `classNames`, both combinations are one field each, and `state` names the command, not the button.

## No cancellable option

- **Chosen:** no workflow-level `cancellable` flag. A tour the user must not end disables its cancel
  control on the workflow, `controls: { cancel: { state: "disabled" } }`, and hides the button with
  `classNames` if it should not show. `tour.cancel()` and `context.cancel()` always cancel a running
  tour, and a lost target with no step to fall back to always cancels it.
- **Rejected:** keeping `cancellable: false` next to `controls.cancel`.
- **Why:** its UI half duplicated the cancel control, a second public way to do the same thing. Its
  other half made cancel the only command whose API could be refused: `advance` and `previous` have
  no such flag, their controls only gate the UI. Refusing the application's own `tour.cancel()` call
  protects against nothing the application does not control, and it turned a lost target into an
  error instead of a cancellation.

## Controls as a root option

- **Chosen:** a root `controls: { advance, previous, cancel }` option, next to `popover` and
  `behavior`, each command holding `{ state, keys }`. A step overrides the workflow field by field.
- **Rejected:** keeping `popover.keyboardShortcuts`; splitting the two into `popover.controls`
  (states) and `behavior.keyboard` (keys); a `"disabled" | { state, keys }` shorthand per command;
  naming the field `keyboard` or `keyboards`.
- **Why:** state and keys describe the same command and the state already gates the keys, so one
  entry per command shows in one place whether it is available and how it runs. They are not
  popover presentation: they apply to triggers rendered outside the popover and to `overlayClick`.
  The shorthand made the merge ambiguous (does a step's `"disabled"` drop the workflow's `keys`?).
  `keys` names what the array holds, `KeyboardEvent.key` values.

## Footer visibility

- **Chosen:** the footer is always rendered, including in the default tour component.
- **Rejected:** `GlowTourFooter` hiding itself, and the default tour component omitting its footer
  when every control is hidden.
- **Why:** the footer accepts arbitrary children, and the default tour component is a plain
  composition of the public components. A tour without a footer is composed without one.

## JSON config format version

- **Chosen:** a required `version: "1.1"` field and builder-aligned keys (`beforeEnter`,
  `beforeLeave`, `targetEvents`). Old keys are reported as unknown keys.
- **Rejected:** a `schemaVersion` key, a numeric `version: 2`, and "renamed to" messages for every
  old key.
- **Why:** `schemaVersion` had been added and removed without a recorded reason, and the change was
  kept to its minimum on purpose. Rename messages would add a lookup table to the config entry
  point, whose gzip budget is 5.25 KiB, for a one-time migration that the migration guide covers.

## No runtime checks for 1.3 builder keys

- **Rejected:** throwing when the builder receives a 1.3 option name such as `hideFooter`.
- **Why:** TypeScript already reports every removed name, and the JSON config validation reports
  unknown keys. Runtime checks would add bytes to the core bundle for every user.

## Component names

- **Chosen:** the `GlowTour` prefix on every component of every adapter, `GlowTourPreviousTrigger`,
  and the Vanilla `<glow-tour-default>` element. React, Solid and Vue also export a `GlowTour`
  object that groups the composition components without their prefix (`<GlowTour.Root>`), next
  to the named exports.
- **Rejected:** keeping the unprefixed React and Solid components, `GlowTour.Default`, the "back"
  trigger naming, `createDefaultTourElement()`, and `export * as GlowTour` for the object.
- **Why:** names differed between adapters, and "back" did not match `tour.previous()`,
  `canPrevious` or `data-glow-tour-previous-trigger`. The compound syntax is common in JSX and Vue
  templates, so the object stays, limited to the composition components. It is a plain object
  literal because Bun flattens `export * as` into an `__export()` call that bundlers keep: every
  component then stayed in a bundle that only imported `createGlowTour` (332 B to 2093 B gzip
  for React). The object literal is dropped when unused. The default element is declarative like
  the Angular `glow-tour-default` selector; registering it with the other elements costs about
  180 B gzip in `@glowhop/vanilla-tour/auto`.

## Optional title

- **Chosen:** a step without `title` renders no header, and the popover dialog takes its name from
  the content, without `aria-describedby`.
- **Rejected:** keeping `title` required, or rendering an empty header.
- **Why:** short hints do not need a title, and an empty labelled header would give the dialog an
  empty accessible name. Outside a step the header stays rendered, so server and client markup
  still match.

## Detached steps

- **Chosen:** `missingTarget.strategy: "detached"` shows the step centered over a backdrop without a
  cutout, as soon as the target is missing. `context.target` stays typed `HTMLElement` and is the
  document's `<body>`; `targetEvents` are not bound.
- **Rejected:** typing `context.target` as `HTMLElement | null`, and waiting for `timeout` before
  detaching.
- **Why:** a nullable target would force a check in every action and hook, including the many
  workflows that never detach. Waiting first would give `timeout` a second meaning; `wait` already
  covers late targets, and `skip` and `error` also apply at once.

## Step classNames

- **Chosen:** one `classNames` record, on the workflow and on each step, with an entry per rendered
  component (`overlay`, `popover`, `pointer`, `header`, `content`, `footer`, `previous`, `advance`,
  `cancel`). The classes are added after the component's own classes. A step's entry overrides the
  workflow entry for the same component, and `props.update()` replaces the classes of the components
  it names. The adapters apply the classes; the core only merges them.
- **Rejected:** a `className` inside `overlay`, `popover` and `indicator`; a name such as
  `additionalClassNames`; adding a step's classes to the workflow ones; applying the classes from the
  core.
- **Why:** the header, content, footer and buttons have no option object, and one record covers every
  component the same way. `classNames` already means added classes in component libraries. Overriding
  per component matches how the other step options merge over the workflow defaults, and lets a step
  drop a workflow class without a separate removal syntax. The core cannot apply them: it does not know the header,
  content, footer and buttons, and the frameworks own the `class` attribute of what they render, so a
  class set from outside would be erased on the next render. To stay within the size budgets, the class arrays are
  shared with the definition instead of being copied and frozen.
