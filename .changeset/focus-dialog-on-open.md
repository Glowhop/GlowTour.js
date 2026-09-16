---
"@glowhop/core-tour": patch
---

Focus the popover itself when a tour opens, instead of its Advance button. Screen readers now announce the step content along with the dialog title when the tour opens; VoiceOver used to read only the title and the focused button. `Tab` reaches the buttons and the keyboard shortcuts work from the popover. When the next step opens while focus is still on the popover, focus stays there.
