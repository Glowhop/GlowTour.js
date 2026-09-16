---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": minor
---

Add the `"detached"` missing-target strategy.

**Added**

- `behavior.missingTarget.strategy: "detached"` shows a step whose target is not found with its popover centered in the viewport, over a backdrop that covers the whole screen. It applies as soon as the target is missing, and also when a target disappears for good while its step is on screen.
- A detached step has no cutout and no pointer, does not scroll, and keeps the page blocked even when `allowInteraction` is `true`. Its `targetEvents` are not bound, and `context.target` is the document's `<body>`.
- The JSON config accepts `"detached"`.
