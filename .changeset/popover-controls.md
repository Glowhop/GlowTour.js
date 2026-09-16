---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": minor
---

Replace the popover button flags with `popover.controls`.

**Breaking changes**

- `popover.hideFooter`, `popover.hideAdvanceButton`, `popover.hidePreviousButton`, `popover.disableAdvanceButton` and `popover.disablePreviousButton` are removed. Set `popover.controls: { advance, previous, cancel }` to `"visible"`, `"hidden"` or `"disabled"` instead.
- A hidden control now blocks its keyboard shortcut and `overlayClick`, like a disabled one. `hideAdvanceButton` used to leave the shortcut active.
- The footer is always rendered, in the footer component and in the default tour component.
- The JSON config follows the same shape and rejects the old keys.

**Added**

- `popover.controls.cancel` hides or disables the cancel button, with `Escape` and `overlayClick: "cancel"`. `tour.cancel()` keeps working.
- `PopoverControls` and `TourControlState` types.
