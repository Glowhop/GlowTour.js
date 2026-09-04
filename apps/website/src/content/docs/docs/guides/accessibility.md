---
title: Accessibility guide
description: Understand Glow Tour's accessibility features and keyboard support.
---

Glow Tour is built with accessibility as a core principle. Every adapter renders the same ARIA semantics, keyboard shortcuts, and focus-restoration behavior. Tours are fully usable with keyboard navigation and screen readers.

## ARIA semantics

Every adapter renders the same semantic structure for consistent assistive technology support:

| Element | Role/Attributes | Purpose |
| --- | --- | --- |
| Popover | `role="dialog"`, `aria-labelledby`, `aria-describedby`, `aria-modal` | Identifies the tour popover as a modal dialog |
| Title | Referenced by `aria-labelledby` | Provides the dialog name to screen readers |
| Description | `aria-live="polite"` | Announces content changes when stepping forward/back |
| Overlay | `role="presentation"`, `aria-hidden` | Marks the decorative overlay as non-interactive |
| Pointer | `aria-hidden="true"` | Hides the decorative indicator from screen readers |
| Buttons | `aria-controls`, `aria-label`, `aria-disabled`, `aria-keyshortcuts` | Describes button purpose and available keyboard shortcuts |

When a step disallows target interaction, the popover's `aria-modal` is set to `true` and sibling branches of the document are marked `aria-hidden` to prevent focus from escaping.

## Keyboard shortcuts

Glow Tour supports full keyboard navigation with no mouse required:

| Key(s) | Command | Condition |
| --- | --- | --- |
| `Escape` | Cancel/dismiss tour | Only when the tour is cancellable |
| `Enter` or `ArrowRight` | Advance to next step | Only when advancing is allowed |
| `ArrowLeft` or `Backspace` | Go to previous step | Only when going back is allowed |
| `Tab` | Focus navigation | Trapped within popover while step disallows outside interaction |

Shortcuts are disabled while:
- A modifier key (`Ctrl`, `Cmd`, `Alt`) is held
- IME composition is in progress
- Focus is in an editable field (for Advance/Previous only; Escape always works)
- The event has already been handled

The `aria-keyshortcuts` attribute on each button is automatically kept in sync with the active shortcuts, so screen readers and visible labels always match the actual keyboard behavior.

## Per-step keyboard overrides

Override the default keyboard shortcuts for a specific step by providing a `keyboardShortcuts` object in the popover options:

```typescript
const workflow = tour
  .create("advanced")
  .step({
    target: "#field",
    title: "Custom shortcuts",
    content: "This step has different keyboard shortcuts.",
    popover: {
      keyboardShortcuts: {
        advance: ["Enter"],  // Only Enter, no ArrowRight
        previous: [],        // No previous (disable BackSpace/ArrowLeft)
        cancel: ["Escape"],  // Keep Escape default
      },
    },
  })
  .build();
```

## Focus management

Glow Tour automatically manages focus for an accessible experience:

### Focus trap

While a step is active, focus is trapped inside the popover. Pressing `Tab` cycles through the popover's interactive elements and back to the first one — it does not escape to the rest of the page. If the step allows target interaction, the target is included in the focus cycle.

### Focus restoration

When the tour ends (whether it completes, is cancelled, or errors), focus automatically returns to the element that had focus before the tour started. This ensures users return to their original position on the page and don't lose context.

## Rendering semantics

All adapters (React, Vue, Solid, Angular, Vanilla) render identical ARIA markup because they all delegate to the same Core state machine. This means:

- No custom keyboard handling in adapters — there is a single source of truth in Core
- All tours behave identically across frameworks
- Assistive technology sees consistent semantics everywhere

## Testing accessibility

To verify your tour's accessibility:

1. **Navigate with keyboard only**: Use Tab, Escape, Arrow keys, and Enter to control the tour
2. **Test with a screen reader**: Use VoiceOver (macOS), NVDA (Windows), or JAWS to hear how the tour is announced
3. **Check color contrast**: Ensure the default or custom colors meet WCAG AA standards (4.5:1 for text)
4. **Verify focus visibility**: Focus indicators should be clearly visible during keyboard navigation

## Compliance notes

Glow Tour follows the WCAG 2.1 AA standard for the dialog and its keyboard navigation. The default theme's color contrast was verified against AA standards. Custom themes should maintain adequate contrast ratios for text and interactive elements.
