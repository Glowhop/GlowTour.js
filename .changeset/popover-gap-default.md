---
"@glowhop/core-tour": patch
---

Reduce the default popover gap from `32` to `16`.

The default now matches the `--glow-tour-viewport-gap` token in `@glowhop/styles-tour`, which caps
the popover at `100vw - 2 * gap`. The constant is also the minimum margin the popover keeps from
the viewport edges, so the two disagreeing meant a popover at its CSS maximum size could not
satisfy the 32px margin and fell back to centered on narrow viewports. They now agree.

Visually, the popover sits closer to its target — the 12px arrow protrudes about 8.5px, so it
previously stopped some 23px short of the target and now lands about 7px away.

Steps that set `popover.gap` explicitly are unaffected.
