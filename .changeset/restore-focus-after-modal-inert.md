---
"@glowhop/core-tour": patch
---

Restore focus to the element that started the tour when its first step is modal. Making the rest of the page inert blurred that element before the focus guard remembered it, so focus fell back to the document body when the tour ended, in every adapter.
