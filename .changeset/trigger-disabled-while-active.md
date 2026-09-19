---
"@glowhop/react-tour": patch
"@glowhop/vue-tour": patch
"@glowhop/solid-tour": patch
---

Only let tour state disable a trigger while the tour is active, as the vanilla and Angular adapters already do. The React, Vue and Solid triggers were also natively disabled outside of it, so a start replacing the tour on screen disabled the focused trigger during its `onStart` and blurred it. A step's `controls.<command>.state: "disabled"` still disables its trigger at any time.
