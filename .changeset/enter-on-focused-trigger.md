---
"@glowhop/core-tour": patch
---

Make Enter activate the focused tour button. Enter was always read as the advance shortcut, so pressing it on a focused Back button moved forward and on Skip finished the tour; it now runs that button's own command, and Enter on other controls in the popover content is left to the browser. Going back onto a step whose Back button is unavailable, such as the first one, now focuses Advance instead of leaving focus on an unavailable control.
