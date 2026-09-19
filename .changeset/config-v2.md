---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": minor
---

Align the JSON config with the builder names and version its format.

- A workflow config carries `version: "1.1"`.
- Step config keys follow the builder: `beforeEnter`, `beforeLeave`, and `targetEvents` (entries keep `event` and `action`).
- `TargetEventConfig` replaces `EventHandlerConfig`, and the core `TargetEventHandler` type replaces `EventHandler`.
