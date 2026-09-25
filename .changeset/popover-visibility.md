---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": patch
---

Add `tour.hidePopover()` and `tour.showPopover()`, also returned by `useGlowTour` and `injectGlowTour`. Hiding the popover keeps the overlay, the indicator and the scroll lock, and the tour keeps running: the page leaves `inert`, focus moves from the popover to the target, and the keyboard shortcuts do nothing until the popover is shown again. It stays hidden across steps, until `showPopover()` or the end of the tour, and a new `start()` shows it again. Showing it replays its entrance, makes the step modal again and moves focus back into it. `TourState` gains `popoverHidden`.
