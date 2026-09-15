---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": minor
---

Reshape the step options around positive booleans and grouped behavior settings.

**Breaking changes**

- `behavior.disableAutoFocus` and `behavior.disableAutoScroll` are replaced by `behavior.autoFocus` and `behavior.autoScroll`, which default to `true`: `disableAutoFocus: true` becomes `autoFocus: false`.
- `indicator.disabled` and `popover.arrow.disabled` are renamed to `indicator.hidden` and `popover.arrow.hidden`.
- `popover.arrow.disableAutoStyles` is replaced by `popover.arrow.autoStyles`, which defaults to `true`: `disableAutoStyles: true` becomes `autoStyles: false`.
- `popover.keyboardShortcuts` moves to `behavior.keyboard`, with the same `advance`, `previous` and `cancel` arrays.
- `behavior.missingTargetStrategy` and `behavior.targetTimeout` are grouped into `behavior.missingTarget: { strategy, timeout }`.
- The JSON config follows the same shapes and rejects the old keys.

**Added**

- `KeyboardShortcuts` and `MissingTargetOptions` types.
