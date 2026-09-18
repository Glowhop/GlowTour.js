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

- `popover.hideFooter`, `popover.hideAdvanceButton`, `popover.hidePreviousButton`, `popover.disableAdvanceButton` and `popover.disablePreviousButton` are removed. Set the `state` of `controls.advance`, `controls.previous` or `controls.cancel` to `"enabled"` or `"disabled"` instead: `disableAdvanceButton: true` becomes `controls: { advance: { state: "disabled" } }`. To hide a button, give it a class through `classNames` and hide that class in your CSS: `hideAdvanceButton: true` becomes `classNames: { advance: "tour-hidden" }`, and `hideFooter: true` becomes `classNames: { footer: "tour-hidden" }`.
- The keys that run each command sit next to its state, in `controls.<command>.keys`. A step's controls override the workflow ones field by field, so a step setting only `advance.state` keeps the workflow's `advance.keys`.
- A disabled control blocks its button, its keys and `overlayClick`. A button hidden through `classNames` keeps its keys, like `hideAdvanceButton` did; disable the control to block them too.
- The footer is always rendered, in the footer component and in the default tour component.
- The JSON config follows the same shape and rejects the old keys.

**Added**

- `controls.cancel.state` disables the cancel button, with its keys and `overlayClick: "cancel"`. `tour.cancel()` keeps working.
- `TourControls`, `TourControl` and `TourControlState` types.
