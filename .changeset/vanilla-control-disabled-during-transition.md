---
"@glowhop/vanilla-tour": patch
---

Apply a step's disabled `popover.controls` as soon as that step renders. The vanilla adapter suppressed the whole disabled computation while the tour status was not `"active"`, so a step entered with `controls.advance: "disabled"` painted its popover with an enabled, clickable button and only disabled it once the transition ended. A `controls` value authored by the step is now honoured from the first render that carries it, transition included, while a missing runtime capability still only counts once the step is active - the behaviour the other adapters already had.
