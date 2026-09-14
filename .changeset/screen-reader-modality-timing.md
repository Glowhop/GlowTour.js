---
"@glowhop/core-tour": patch
---

Keep screen readers on track when a modal step opens or the tour ends. The rest of the page now becomes inert, and the popover is marked `aria-modal`, as focus moves into the presented popover rather than at the start of the transition, like a native modal dialog. When the tour ends, focus returns to the element that started it once the popover has faded out, so screen readers announce it.
