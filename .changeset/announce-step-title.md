---
"@glowhop/vanilla-tour": patch
---

Stop re-announcing unchanged step text. The vanilla adapter rewrote the title and content on every state update, even when they had not changed, and screen readers read the content live region again, including the previous step's text during a step change. Unchanged values are now left alone.
