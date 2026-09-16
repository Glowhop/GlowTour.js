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

## Keyboard shortcuts as behavior

- **Chosen:** `behavior.keyboard`.
- **Rejected:** keeping `popover.keyboardShortcuts`.
- **Why:** shortcuts drive navigation, not the popover's presentation, and they apply even when the
  popover renders no trigger.

## One state per popover control

- **Chosen:** `popover.controls: { advance, previous, cancel }` with `"visible"`, `"hidden"` or
  `"disabled"`. Both non-visible states block the button, its shortcut and `overlayClick`.
- **Rejected:** the `hide*Button`, `disable*Button` and `hideFooter` booleans.
- **Why:** the booleans allowed contradictory combinations, a hidden button kept its keyboard
  shortcut, and the cancel button had no equivalent.

## Footer visibility

- **Chosen:** only the default tour component omits its footer when every control is hidden.
- **Rejected:** `GlowTourFooter` hiding itself.
- **Why:** the footer accepts arbitrary children. Hiding it from the control states would remove
  content the consumer placed there.

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
  and the Vanilla `<glow-tour-default>` element.
- **Rejected:** keeping the unprefixed React and Solid components with their `GlowTour` namespace
  object, the "back" trigger naming, and `createDefaultTourElement()`.
- **Why:** names differed between adapters, the namespace object shared its name with the core
  `GlowTour` interface and referenced every component at once, and "back" did not match
  `tour.previous()`, `canPrevious` or `data-glow-tour-previous-trigger`. The default element is
  declarative like the Angular `glow-tour-default` selector; registering it with the other elements
  costs about 180 B gzip in `@glowhop/vanilla-tour/auto`.

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
  `cancel`). A step's classes are added after the workflow ones; `props.update()` replaces the
  classes of the components it names. The adapters apply the classes; the core only merges them.
- **Rejected:** a `className` inside `overlay`, `popover` and `indicator`; a name such as
  `additionalClassNames`; replacing the workflow classes with the step ones; applying the classes
  from the core.
- **Why:** the header, content, footer and buttons have no option object, and one record covers every
  component the same way. `classNames` already means added classes in component libraries. Replacing
  would force each step to repeat the workflow classes. Adding them in `update()` as well would leave
  no way to remove a class during a step. The core cannot apply them: it does not know the header,
  content, footer and buttons, and the frameworks own the `class` attribute of what they render, so a
  class set from outside would be erased on the next render. To stay within the size budgets, duplicate
  classes are not removed (the browser ignores them) and the class arrays are shared with the
  definition instead of being copied and frozen.
