---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": minor
---

Add `classNames` to style a tour component on a given step.

**Added**

- `classNames` on the workflow options and on each step, in the builder and in the JSON config. It takes one entry per component (`overlay`, `popover`, `pointer`, `header`, `content`, `footer`, `previous`, `advance`, `cancel`), each a string or an array of strings.
- The classes are added after the classes given to the component itself, which are never replaced. A step's entry overrides the workflow entry for the same component, and the components the step leaves out keep the workflow classes.
- `context.props.update({ classNames })` changes the classes of the components it names during the step. Use the function form to add or remove a single class.
- `ClassValue` and `TourClassNames` types.
