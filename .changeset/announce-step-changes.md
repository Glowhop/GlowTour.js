---
"@glowhop/core-tour": patch
---

Announce step changes to screen readers. Between two steps the popover was hidden from assistive technology (`aria-hidden` and `inert`) while its content changed, so the live region never announced the new step and focus left the dialog. The popover now stays exposed while it fades between steps, and is only hidden when the tour ends. Pointer input is still blocked during the fade, as before.
