---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": minor
---

Make step behavior part of the dynamic step props.

**Breaking changes**

- `WorkflowStepDefinition.behavior` is removed: the step behavior now lives in `props.behavior`, merged over the workflow `behavior` defaults like the other options.
- `props.set()` replaces `behavior` along with the other props: spread the current props to keep it.

**Added**

- `context.props.update({ behavior })` changes the step behavior while the tour runs, and the value appears in `state.currentStep.currentProps.behavior`. `allowInteraction` applies at once (modality, focus, indicator fade), `overlayClick` on the next click, `autoFocus` / `autoScroll` / `scroll` on the next entry, `keyboard` on the next key press, and `missingTarget` on the next target resolution.
- `props.set()` and `props.update()` validate `behavior`, like the other options.
