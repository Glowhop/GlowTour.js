---
"@glowhop/core-tour": patch
---

Fix tours hanging in `transitioning` when the document is hidden.

A hidden document freezes its animation timeline: `currentTime` stops advancing, the animation stays `running`, and `animation.finished` never settles. Every step transition awaits that promise, so a tour started or advanced while the page was hidden — a background tab, a prerendered page, headless automation — stayed stuck in `status: "transitioning"` with `canAdvance` false, and the `run()` / `advance()` promise never resolved.

Animations that cannot progress are now finished immediately instead of awaited, both when the document is already hidden and when it becomes hidden mid-transition. The transition lands on its final visual state right away, and resumes behaving normally once the page is visible again.
