---
"@glowhop/angular-tour": patch
---

Keep focus on the tour triggers while a step changes. The Angular triggers were natively disabled for the length of the transition, which blurred the focused trigger and made screen readers lose their place. Tour state now only disables a trigger while the tour is active, as in the other adapters.
