---
"@glowhop/core-tour": minor
"@glowhop/react-tour": patch
"@glowhop/vue-tour": patch
"@glowhop/solid-tour": patch
"@glowhop/angular-tour": patch
"@glowhop/vanilla-tour": patch
---

Report the wait when a step's target is still resolving. A target given as an async resolver, or one the `"wait"` strategy is polling for, keeps the tour on the step the user asked to leave: for as long as that wait lasts, the popover on screen carries `data-glow-tour-awaiting-target` and its advance control is disabled, so a tour waiting on a slow target no longer looks idle with a button that does nothing. Both are cleared when the target settles, and `TourState` gains `awaitingTarget` so a UI that renders its own controls - every adapter's trigger components, and any custom one - can show the wait rather than read it from the DOM. Cancel and previous stay available, a target that resolves synchronously never enters this state, and the freeze of a target lost mid-step is unchanged.
