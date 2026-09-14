---
"@glowhop/react-tour": patch
"@glowhop/vue-tour": patch
"@glowhop/solid-tour": patch
"@glowhop/angular-tour": patch
"@glowhop/vanilla-tour": patch
---

Announce the step title, not only its content, when a tour moves to another step. The header is now a polite live region, like the content, so screen readers read "title, content". The vanilla adapter also stops rewriting an unchanged title or content on every state update, which made screen readers repeat the previous step's text.
