---
"@glowhop/react-tour": patch
"@glowhop/vue-tour": patch
"@glowhop/solid-tour": patch
"@glowhop/angular-tour": patch
"@glowhop/vanilla-tour": patch
---

Disable the previous trigger on the first step as soon as that step is committed, instead of once the tour reaches `"active"`. The adapters only read the navigation capabilities while the tour is active, so between the popover appearing and the end of the entrance the first step showed an enabled Back button that refused every click. Having nothing to go back to is structural, not a transient capability, so it no longer waits for the status. A tour that is starting over a presentation still on screen keeps that presentation's state, so no focused trigger is newly disabled.
