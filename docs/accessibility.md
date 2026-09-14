# Accessibility: implementation contract

> **Scope.** This is the internal contract and audit record, written against the source. The
> user-facing guide is a separate document - published at <https://glowtour.dev/docs/guides/accessibility>,
> source in [`apps/website/src/content/docs/docs/guides/accessibility.md`](../apps/website/src/content/docs/docs/guides/accessibility.md).
> Keep behavioural claims here (they cite the files that implement them); put anything a consumer
> needs to read in the guide, not in both.

This document is the accessibility contract for GlowTour.js: the ARIA semantics every adapter
renders, the keyboard shortcuts the core engine supports, and the focus-restoration behavior
guaranteed when a tour ends. It reflects the current `packages/core` state machine
(`tour-view-driver.ts`, `focus-guard.ts`) and the adapter markup in each
`tour-components.ts(x)` (`packages/react`, `packages/vue`, `packages/angular`, `packages/solid`,
`packages/vanilla`).

## ARIA contract

Every adapter renders the same semantics because all of them delegate presentation state and
wiring to `@glowhop/core-tour`; the adapters differ only in how they bind props/attributes to
their framework's rendering model, not in which attributes are applied.

| Element | Attributes |
| --- | --- |
| Popover (`data-glow-tour-popover`) | `role="dialog"`, `aria-labelledby` (title id), `aria-describedby` (description id), `aria-modal="true"` while the step disallows target interaction |
| Description content | `aria-live="polite"` so step text changes are announced |
| Overlay/backdrop | `role="presentation"`, `aria-hidden` |
| Pointer/indicator | `aria-hidden="true"` (decorative) |
| Advance / Previous / Cancel triggers | `aria-controls` (popover id), `aria-label`, `aria-disabled`, `aria-keyshortcuts` (reflects the active step's keyboard shortcuts, see below) |

The tour root also marks sibling branches of the document `inert` while a step disallows outside
interaction, and clears that state when the tour becomes non-modal or ends (`syncModality()` and
`releaseModality()` in `tour-view-driver.ts`).

Timing is part of the contract, because real screen readers lose track otherwise:

- `aria-modal` and the `inert` branches are applied in `show()` right before `activateFocus()`, as
  focus moves into the presented popover, like a native modal dialog. Inerting the page while the
  popover is still hidden left VoiceOver with nothing to read.
- `clear()` releases the focus guard with `FocusGuard.release()` and restores focus only after the
  popover has faded out. Moving focus in the same task that lifts `inert` was not announced.
- Between two steps the popover is not hidden from assistive technology:
  `initializeProps(false)` and `disappear(false)` on the popover keep it
  exposed so the live region announces the new content and `inert` never blurs the focused
  trigger. Pointer input is blocked with `pointer-events: none` during the fade instead, because
  the controller ignores commands while transitioning.
- Tour state only disables a trigger while the tour is `active` (the vanilla adapter's
  `capabilityDisabled`, and `unavailableWhileActive()` in the Angular adapter). A trigger natively
  disabled during a transition loses focus.

## Keyboard shortcut contract

Keyboard handling lives entirely in `packages/core/src/dom/tour-view-driver.ts`
(`handleKeydown`), attached once per active step as a single `keydown` listener on the step's
owner `window`. No adapter attaches its own keyboard handling - this is what keeps the contract
identical across React, Vue, Angular, Solid, and Vanilla; there is a single implementation to
diverge from, and none of the adapter `tour-components.ts(x)` files add one.

| Key(s) | Command | Notes |
| --- | --- | --- |
| `Escape` | Cancel / dismiss | Only fires when the tour is cancellable (`canCommand("cancel", step)`) |
| `Enter`, `ArrowRight` | Advance | Only fires when advancing is currently allowed for the step |
| `ArrowLeft`, `Backspace` | Previous | Only fires when going back is currently allowed for the step |
| `Tab` | Focus loop | While the step disallows outside interaction, Tab is trapped within the popover instead of triggering a shortcut |

`Enter` on a focused tour trigger runs that trigger's own command instead of the advance shortcut,
and `Enter` on any other focusable control in the popover is left to the browser
(`activationCommand()` in `tour-view-driver.ts`, used by both `handleKeydown` and the keydowns
queued during a step transition). A disabled or `aria-disabled` trigger does nothing.

Per-step overrides are supported via `step.popover?.keyboardShortcuts`; when a step doesn't
override a command, the defaults above apply. Shortcuts are ignored while:
- a modifier key (`ctrlKey`/`metaKey`/`altKey`) is held,
- the event is part of IME composition (`isComposing`),
- the event was already handled (`defaultPrevented`),
- for Advance/Previous only: focus is in an editable field (`isEditable`), so typing in a
  step's own form controls doesn't accidentally navigate the tour. Escape/cancel is intentionally
  exempt from the editable-field check so it always dismisses.

`aria-keyshortcuts` on each trigger button is kept in sync with the resolved shortcut list per
step (`syncShortcutLabels`), so assistive technology and visible labels always match what the
keyboard actually does.

## Focus restoration

`FocusGuard` (`packages/core/src/state/focus-guard.ts`) does two things:

1. **While active**: traps focus inside the popover, redirecting any focus that lands outside the
   popover (or outside the currently-allowed target, if the step permits target interaction) to
   the step's Advance or Previous trigger, or a neutral fallback element.
2. **On deactivation**: restores focus to whatever element had focus immediately before the guard
   was first activated (the tour's trigger element) - but only if that element is still connected
   to the document.

Entering a step focuses its Advance trigger, or its Previous trigger when navigating back. When
that Previous trigger is unavailable, the guard falls back to Advance (`findFocusable()` in
`focus-guard.ts`): focus left on an unavailable control is a dead end, and NVDA re-reads the whole
dialog when the focused control changes state.

The guard is activated once per tour (the first `show()` call marks `initialFocus`) and stays
active across step transitions; it is only deactivated - restoring focus - when the tour view is
cleared. `driver.clear()` is invoked by every exit path in `tour-controller.ts`:

- `finish()` - tour completed
- `cancelCurrent()` - tour cancelled/dismissed (covers Escape, a Cancel trigger click, and
  programmatic `cancel()`)
- `handleFailure()` - tour ended due to an unrecoverable error

`releaseMount()` / `dispose()` also deactivate the guard when the tour root itself unmounts. This
guarantees focus returns to the trigger element on every exit path, not just while the tour is
being trapped. Coverage: `packages/core/src/state/focus-guard.test.ts` includes
`"restores the initially focused element when deactivated"`.

## Verification notes

- Real screen readers: `apps/screen-readers` renders the same three-step tour with every adapter.
  `.github/workflows/screen-readers.yml` drives VoiceOver (macOS runners, WebKit and Chromium)
  and NVDA (Windows runners, Chromium and Firefox) through it with Guidepup
  (`tests/voiceover.pw.ts`, `tests/nvda.pw.ts`, shared `tests/scenario.ts`) on pull requests that
  touch `packages/**`, weekly, and on demand. Spoken transcripts are uploaded as artifacts. The
  first fully green run was on commit `5ecc980` (PR #87): 20 of 20 adapter and pairing
  combinations passed, one of them (Angular, VoiceOver with Chromium) only on retry.
- Harness pitfalls found while building it, so they are not rediscovered: Guidepup's default
  `capture: "initial"` drops phrases announced after the first page of output (dialog opening,
  live region, restored focus), so the suites capture everything; a Playwright `focus()` moves
  neither screen reader's cursor, so the trigger is reached with `Tab` through the screen reader;
  and `Shift+Tab` from the first focusable element leaves the page for the browser toolbar.
- Accessibility tree: `apps/screen-readers/tests/accessibility-tree.pw.ts` runs in the `ci.yml`
  "Accessibility tree" job on Chromium, Firefox and WebKit. It covers the dialog name and
  description, modality (including Chromium's native tree through CDP), the persistent live
  region during step transitions, keyboard navigation and focus restoration.

- Focus restoration and keyboard-shortcut wiring were verified by reading
  `packages/core/src/dom/tour-view-driver.ts`, `packages/core/src/state/focus-guard.ts`, and
  `packages/core/src/runtime/tour-controller.ts`, confirming all three exit paths funnel through
  `driver.clear()`, and by grepping every adapter's `tour-components.ts(x)` for keyboard handling
  (none exists outside core).
- An axe-core pass was run against a live `apps/playground` preview (React lab) using the
  project's Browser preview tooling. It covered the **light** palette only; the dark palette
  shipped later and has had no equivalent pass. It found and fixed three real WCAG AA color-contrast
  violations in `apps/playground/lab/lab.css` (`.lab-card-number`, `.lab-inspector-list dt`,
  `.lab-empty-log` - all under 4.5:1 against their backgrounds). It also flagged the Advance
  trigger's own contrast; that flag was traced to the preview tab running backgrounded
  (`document.hidden`), which stalls the popover's `requestAnimationFrame`-driven fade-in and
  leaves `getComputedStyle` reporting a mid-transition, partially transparent background. The
  shipped steady-state contrast (white text on `#4c35fd`) computes to ~6.49:1, well above the
  4.5:1 threshold, so no source change was needed there.
