---
"@glowhop/core-tour": minor
---

When a step's target is removed from the DOM while its step is showing, the tour now freezes the presentation in place for a short grace period and resumes on the target without a re-entrance animation if it reconnects, instead of immediately unmounting and replaying the appear animation. Interaction with the underlying page stays blocked during the freeze even when `allowInteraction` is `true`. If the target doesn't come back within the grace period, `missingTargetStrategy` and `targetTimeout` apply exactly as before — the grace period counts against `targetTimeout` rather than extending it.
