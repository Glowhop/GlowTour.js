---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": minor
---

Make the step `title` optional.

**Added**

- `title` can be left out of a step, in the builder and in the JSON config. Without a title, the header is not rendered, the popover dialog takes its accessible name from the content, and `aria-describedby` is removed so the content is not announced twice.
- A header you compose yourself follows the same rule: it renders nothing, or is hidden in the vanilla adapter, while the step has no title.
