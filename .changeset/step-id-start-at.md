---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/vanilla-tour": minor
---

Add stable step ids and resume support: every step now declares a required `id`, and `run(workflow, { startAt })` starts the tour on that step instead of the first one.

**Breaking — every step needs an `id`.**

- Builder: `.step({ id: "invite", target: "#invite-button", title: "…", content: "…" })`.
- JSON config: `"id"` is now a required, unique property of each entry in `steps`.
- Ids are validated when the workflow is built, not when it runs: a missing or duplicated id throws immediately and names the offending step.

`run()` takes an optional second argument, `{ startAt }`, holding a step id. The workflow is not truncated — `totalSteps` is unchanged and `previous()` can go back before the resumed step — and an unknown id throws rather than silently restarting from the beginning. `TourCurrentStep` now carries `id`; step ids are not part of step props and cannot be mutated mid-tour.

No storage or navigation layer ships with this: persisting the position and routing between pages stay with the app, which keeps the core free of browser globals and SSR-safe by construction. See the "Resuming a tour" guide.
