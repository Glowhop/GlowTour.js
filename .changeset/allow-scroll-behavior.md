---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": minor
---

Move `allowScroll` into the step behavior.

**Breaking changes**

- `StartOptions.allowScroll` and the `allowScroll` key of a JSON config are removed: use `behavior.allowScroll`. The workflow `behavior` still applies it to every step.

**Added**

- `behavior.allowScroll` can be set per step, and `context.props.update({ behavior: { allowScroll } })` locks or releases page scroll at once while the step is shown.
