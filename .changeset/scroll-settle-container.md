---
"@glowhop/core-tour": patch
"@glowhop/react-tour": patch
"@glowhop/vue-tour": patch
"@glowhop/solid-tour": patch
"@glowhop/angular-tour": patch
"@glowhop/vanilla-tour": patch
---

Fix the popover blinking when a step scrolls its target into view on a page that scrolls inside a container rather than the document. The scroll counted as finished a few frames in, so the popover appeared mid-scroll, stepped aside as if the user were scrolling, and came back once the page stopped. The popover now waits until the target itself has stopped moving.
