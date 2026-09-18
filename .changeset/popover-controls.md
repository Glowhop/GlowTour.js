---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": minor
---

Replace the popover button flags and keyboard shortcuts with a root `controls` option.

**Breaking changes**

- `popover.hideFooter`, `popover.hideAdvanceButton`, `popover.hidePreviousButton`, `popover.disableAdvanceButton` and `popover.disablePreviousButton` are removed. Set the `state` of `controls.advance`, `controls.previous` or `controls.cancel` to `"visible"`, `"hidden"` or `"disabled"` instead: `hideAdvanceButton: true` becomes `controls: { advance: { state: "hidden" } }`.
- The keys that run each command sit next to its state, in `controls.<command>.keys`. A step's controls override the workflow ones field by field, so a step setting only `advance.state` keeps the workflow's `advance.keys`.
- A hidden control now blocks its keys and `overlayClick`, like a disabled one. `hideAdvanceButton` used to leave the shortcut active.
- The footer is always rendered, in the footer component and in the default tour component.
- The JSON config follows the same shape and rejects the old keys.

**Added**

- `controls.cancel.state` hides or disables the cancel button, with its keys and `overlayClick: "cancel"`. `tour.cancel()` keeps working.
- `TourControls`, `TourControl` and `TourControlState` types.
