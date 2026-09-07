---
"@glowhop/core-tour": minor
---

Add `onEvent`, a monitoring callback for analytics.

Six events with a stable contract — `tour:start`, `step:enter`, `step:leave`,
`tour:complete`, `tour:cancel`, `tour:error` — each carrying the workflow name, the
step id and position, the direction, a `durationMs`, and `source`: whether the
transition came from a button, the keyboard, a click on the overlay, or your own code.

Register it once on the instance (`createGlowTour({ onEvent })`) or per workflow
(`create(name, { onEvent })`); both run, the instance one first. It is monitoring only:
it cannot abort or delay a transition, anything it throws goes to `onSubscriberError`,
and nothing is computed when no listener is attached.

Because every adapter forwards the same options object, this is already the idiomatic
form in React, Vue, Angular, Solid and Vanilla — no adapter-specific API was added.
