---
"@glowhop/core-tour": minor
---

Present a step while its scroll is still in flight, and always realign the target.

Entering a step whose target was off screen used to stall: the tour waited for
the smooth scroll to finish before initialising anything, so the previous step's
elements sat frozen for the whole journey and everything then snapped into place
at once. On Safari before 18.2, where `scrollend` does not exist, that wait was a
full second on every step.

The scroll now runs alongside the presentation. The spotlight appears
immediately and tracks the target as the page travels; the popover and the
pointer enter once the page has come to rest, on a rect that will not move
again. Scroll completion is detected by watching the scroller hold still rather
than by listening for `scrollend`, so every engine behaves the same.

Entering a step also always brings its target to the alignment its scroll
options ask for. Previously a target that was visible anywhere in the viewport
was left where it was, even pressed against an edge with no room for the popover
or the spotlight's padding. `disableAutoScroll` remains the way to opt a step
out of moving the page.

Two smaller behaviour changes fall out of this. The pointer now arrives together
with the popover rather than with the spotlight, since its placement is resolved
against the popover's. And a target lost while its step is still scrolling no
longer freezes the presentation, because a freeze in that window could never be
recovered.
