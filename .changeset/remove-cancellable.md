---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": minor
---

Remove the `cancellable` start option: the cancel control replaces it.

**Breaking changes**

- `cancellable` is removed from the start options and from the JSON config, which rejects it. To keep the user from ending a tour, set `controls: { cancel: { state: "disabled" } }` on the workflow: the Skip button is disabled, and `Escape` and `overlayClick: "cancel"` do nothing. To hide the button as well, give it a class through `classNames.cancel`.
- `tour.cancel()` and `context.cancel()` always cancel a running tour. `cancellable: false` used to ignore them.
- A step whose target disappears, with no step left to fall back to, always cancels the tour. With `cancellable: false` it used to fail with a missing-target error.
- The Skip button is always rendered, like the Previous and Advance buttons, and is disabled when the tour cannot be cancelled. It used to be removed.
