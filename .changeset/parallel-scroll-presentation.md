---
"@glowhop/core-tour": minor
---

Present a step while its scroll is still in flight.

Entering a step whose target was off screen used to stall: the tour waited for
the smooth scroll to finish before initialising anything, so the previous step's
elements sat frozen for the whole journey and everything then snapped into place
at once. On Safari before 18.2, where `scrollend` does not exist, that wait was a
full second on every step.

The scroll now runs alongside the presentation. The spotlight appears
immediately and tracks the target as the page travels; the popover and the
pointer enter once the page has come to rest, on a rect that will not move
again. When a step scrolls, the spotlight moves with the page rather than
morphing from the previous step's cutout; steps that do not scroll keep the
morph.

Scroll completion is detected by watching the scroller hold still rather than by
listening for `scrollend`, so every engine behaves the same. A hidden document,
which neither animates a smooth scroll nor runs frames often enough to watch one
settle, does not wait at all.

When a step scrolls is unchanged: only when part of its target falls outside the
viewport, and never when `disableAutoScroll` is set.

Two smaller behaviour changes fall out of this. The pointer now arrives together
with the popover rather than with the spotlight, since its placement is resolved
against the popover's. And a target lost while its step is still scrolling no
longer freezes the presentation, because a freeze in that window could never be
recovered.
