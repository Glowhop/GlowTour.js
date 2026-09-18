---
"@glowhop/core-tour": minor
---

Give `behavior.autoFocus: false` a real effect. It used to keep focus only when it was already in the popover, and moved it onto the Advance button otherwise, which is where almost every step starts.

**Breaking changes**

- With `autoFocus: false`, focus the page lost, such as the button that started the tour once a modal step makes the page inert, now goes to the popover itself instead of its Advance or Previous button.

**Added**

- With `autoFocus: false` on a step that allows interaction, focus now stays wherever it is on the page, so a user filling in a form the tour walks them through keeps typing in their field.
