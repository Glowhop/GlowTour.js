---
"@glowhop/core-tour": patch
---

Clear the previous tour when `start()` replaces it and the new start is aborted. An `onStart` hook, the first step's `beforeEnter`, or the `onFinish` hook of a workflow without steps calling `abort()` returned the tour to `idle` while the replaced tour's overlay and popover stayed on screen and the page stayed inert.
