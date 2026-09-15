---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": minor
---

Designate steps by id when jumping to them.

**Breaking changes**

- `tour.goToStep(index)` is removed. Use `tour.goTo(id)` with the step's `id`, like `startAt` in `run()`: an index breaks as soon as steps are reordered or inserted.

**Added**

- `tour.goTo(id)` goes to the step with this id, skipping the steps in between. It does nothing while a transition is in progress or when that step is already shown, and throws when no step has this id.
- `context.goTo(id)` in step actions and target event handlers. Like `context.advance()`, it stops the remaining actions of the step. An unknown id fails the tour with `tour:error`.
