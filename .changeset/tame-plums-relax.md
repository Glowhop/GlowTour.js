---
"@glowhop/core-tour": minor
---

When a step's target is removed from the DOM while its step is showing, the tour now freezes the presentation in place for a short grace period and resumes on the target without a re-entrance animation if it reconnects, instead of immediately unmounting and replaying the appear animation. When the target reappears somewhere else, the cutout is animated to its new box rather than snapping, unless the step opts out of animation. Interaction with the underlying page stays blocked during the freeze even when `allowInteraction` is `true`. If the target doesn't come back within the grace period, `missingTargetStrategy` and `targetTimeout` apply exactly as before — the grace period counts against `targetTimeout` rather than extending it. Under `wait` the presentation stays frozen and the tour stays `active` for the whole budget, so the popover's buttons keep working instead of going dead behind a `transitioning` status.
