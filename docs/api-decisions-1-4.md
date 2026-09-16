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
