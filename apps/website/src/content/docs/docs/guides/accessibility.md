---
title: Accessibility guide
description: Understand accessibility and keyboard support in GlowTour.js.
---

GlowTour.js is built with accessibility as a core principle. Every adapter renders the same ARIA semantics, keyboard shortcuts, and focus-restoration behavior. Tours are fully usable with keyboard navigation and screen readers.

## ARIA semantics

Every adapter renders the same semantic structure for consistent assistive technology support:

| Element | Role/Attributes | Purpose |
| --- | --- | --- |
| Popover | `role="dialog"`, `aria-labelledby`, `aria-describedby`, `aria-modal` | Identifies the tour popover as a modal dialog |
| Title | Referenced by `aria-labelledby` | Provides the dialog name to screen readers. A step without a title has no header: the description names the dialog, and `aria-describedby` is dropped so it is not read twice |
| Description | `aria-live="polite"` | Announces content changes when stepping forward/back |
| Overlay | `role="presentation"`, `aria-hidden` | Marks the decorative overlay as non-interactive |
| Pointer | `aria-hidden="true"` | Hides the decorative indicator from screen readers |
| Buttons | `aria-controls`, `aria-label`, `aria-disabled`, `aria-keyshortcuts` | Describes button purpose and available keyboard shortcuts |

When a step disallows target interaction, the popover's `aria-modal` is set to `true` and the rest of the document is made `inert` as focus moves into the popover, so neither focus nor a screen reader's reading cursor can leave the dialog.

Between two steps the popover fades out and back in, but stays exposed to assistive technology the whole time: the description's live region announces the new step, and focus stays where it was, on the popover or on its button.

## Keyboard shortcuts

GlowTour.js supports full keyboard navigation with no mouse required:

| Key(s) | Command | Condition |
| --- | --- | --- |
| `Escape` | Cancel/dismiss tour | Only when the tour is cancellable |
| `Enter` or `ArrowRight` | Advance to next step | Only when advancing is allowed |
| `ArrowLeft` or `Backspace` | Go to previous step | Only when going back is allowed |
| `Tab` | Focus navigation | Trapped within popover while step disallows outside interaction |

Shortcuts are disabled while:
- The matching control is `"hidden"` or `"disabled"` in `popover.controls`
- A modifier key (`Ctrl`, `Cmd`, `Alt`) is held
- IME composition is in progress
- Focus is in an editable field (for Advance/Previous only; Escape always works)
- The event has already been handled

When a tour button has focus, `Enter` activates that button rather than advancing: on Back it goes to the previous step, on Skip it closes the tour. `Enter` on any other control inside the popover content, such as a link or your own button, is left to that control.

The `aria-keyshortcuts` attribute on each button is automatically kept in sync with the active shortcuts, so screen readers and visible labels always match the actual keyboard behavior.

## Per-step keyboard overrides

Override the default keyboard shortcuts for a specific step with `behavior.keyboard`:

```typescript
const workflow = tour
  .create("advanced")
  .step({
    id: "field",
    target: "#field",
    title: "Custom shortcuts",
    content: "This step has different keyboard shortcuts.",
    behavior: {
      keyboard: {
        advance: ["Enter"],  // Only Enter, no ArrowRight
        previous: [],        // No previous (disable BackSpace/ArrowLeft)
        cancel: ["Escape"],  // Keep Escape default
      },
    },
  })
  .build();
```

## Focus management

GlowTour.js automatically manages focus for an accessible experience:

### Focus trap

While a step is active, focus is trapped inside the popover. Pressing `Tab` cycles through the popover's interactive elements and back to the first one - it does not escape to the rest of the page. If the step allows target interaction, the target is included in the focus cycle.

### Focus between steps

When the tour opens, focus goes to the popover itself, so screen readers announce its title and content. `Tab` then reaches its buttons, and the keyboard shortcuts work from the popover.

When the next step opens while focus is on the popover, focus stays there. When it was on a button, focus goes to the step's Advance button, or to its Back button when the user went back. If Back is unavailable on that step, as on the first one, focus goes to Advance instead of an unavailable button.

### Focus restoration

When the tour ends (whether it completes, is cancelled, or errors), focus automatically returns to the element that had focus before the tour started, once the popover has faded out. This ensures users return to their original position on the page, and screen readers announce where they landed.

## Rendering semantics

All adapters (React, Vue, Solid, Angular, Vanilla) render identical ARIA markup because they all delegate to the same Core state machine. This means:

- No custom keyboard handling in adapters - there is a single source of truth in Core
- All tours behave identically across frameworks
- Assistive technology sees consistent semantics everywhere

## Screen reader support

GlowTour.js is tested with real screen readers, not only with accessibility-tree checks. [Guidepup](https://www.guidepup.dev/) drives VoiceOver and NVDA through the same three-step tour rendered by each adapter (React, Vue, Solid, Angular and Vanilla), and the tests assert what the screen reader actually says. They run weekly and on every pull request that changes a package, except VoiceOver with Chromium, which runs weekly only.

| Screen reader | Browser engine | Status |
| --- | --- | --- |
| VoiceOver (macOS) | WebKit (Safari) | Tested |
| VoiceOver (macOS) | Chromium (Chrome) | Tested |
| NVDA (Windows) | Chromium (Chrome) | Tested |
| NVDA (Windows) | Firefox | Tested |
| JAWS, VoiceOver on iOS, TalkBack | - | Not tested automatically |

For each adapter and each pairing, the tests check that:

- the user can reach the button that starts the tour with `Tab` and open it with `Enter`
- opening the tour moves focus onto the dialog, and the screen reader announces its role, title and content
- moving to the next step with `Enter` announces the new step's content
- the Back button, reached with `Shift+Tab`, goes back to the previous step with `Enter`
- on a modal step, the reading cursor reaches the step's title and content and never leaves the dialog
- `Escape` closes the tour, focus returns to the button that started it, and the screen reader announces that button
- the tour can be opened again and finished with `Enter` on the last step, with the same focus return

The browsers are the engines Playwright ships: WebKit stands in for Safari. The arrow-key shortcuts are covered by keyboard tests in every browser engine rather than through the screen readers, which can use arrow keys for their own navigation.

### Known limitations

These come from how screen readers handle live regions and focus, which the ARIA specification leaves partly undefined. They are what the tests observe, not bugs to work around in your tour:

- **The step title is not announced when the step changes; the content is.** The title is the dialog's name: it is announced when the tour opens and stays reachable with the reading cursor. Announcing both as separate live regions does not work with VoiceOver, which reads only one of two regions updated together ([w3c/aria#1689](https://github.com/w3c/aria/issues/1689)). If a step's title matters on its own, repeat it in the content.
- **NVDA reads the dialog's title and content twice when the tour opens** ([nvaccess/nvda#10003](https://github.com/nvaccess/nvda/issues/10003)).
- **Going back to the first step:** Back is unavailable there, so focus moves to Advance. NVDA can read the step content twice while the Back button changes state ([nvaccess/nvda#6265](https://github.com/nvaccess/nvda/issues/6265)), and VoiceOver can skip announcing the content while it describes the focus move; the content stays reachable with the reading cursor.

## Testing accessibility

To verify your tour's accessibility:

1. **Navigate with keyboard only**: Use Tab, Escape, Arrow keys, and Enter to control the tour
2. **Test with a screen reader**: Use VoiceOver (macOS), NVDA (Windows), or JAWS to hear how the tour is announced
3. **Check color contrast**: Ensure the default or custom colors meet WCAG AA standards (4.5:1 for text)
4. **Verify focus visibility**: Focus indicators should be clearly visible during keyboard navigation

## Compliance notes

GlowTour.js follows the WCAG 2.1 AA standard for the dialog and its keyboard navigation.

Colour contrast is a different matter. The default palettes - light and dark - are a sensible
default, not a certified one: contrast depends on the surface you place the tour over and on any
tokens you override, so it is yours to verify. See the [theming guide](/docs/guides/theming#contrast)
for which tokens to check.

The implementation-level contract behind this page - the exact source of each ARIA attribute, the
keyboard handler, and the focus-guard exit paths - is recorded in `docs/accessibility.md` in the
repository.
