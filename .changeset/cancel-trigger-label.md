---
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": minor
---

Let the cancel trigger's text be set, like the advance and previous ones already allow. `GlowTourCancelTrigger` takes a `cancelLabel` in React, Vue, Solid and Angular, and the vanilla `<glow-tour-cancel-trigger>` reads a `cancel-label` attribute. The default stays `"Skip"`, and an explicit `ariaLabel` still wins over the label for the accessible name.
