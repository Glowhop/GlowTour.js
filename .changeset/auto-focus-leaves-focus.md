---
"@glowhop/core-tour": minor
---

Make `behavior.autoFocus: false` never move focus during a step. It used to keep focus only when it was already in the popover, and moved it onto the Advance button otherwise, which is where almost every step starts.

**Breaking changes**

- With `autoFocus: false`, focus the page lost, such as the button that started the tour once a modal step makes the page inert, now stays on the body instead of moving onto the Advance or Previous button. Move it yourself once the step is shown if it needs to be somewhere.
- With `autoFocus: false`, focus is no longer pulled back into the popover when the focused target is removed, or when `allowInteraction` is turned off while the target has focus.

**Added**

- With `autoFocus: false` on a step that allows interaction, focus now stays wherever it is on the page, so a user filling in a form the tour walks them through keeps typing in their field.

The focus trap and the focus restoration at the end of the tour are unchanged.
