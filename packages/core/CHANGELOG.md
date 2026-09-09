# @glowhop/core-tour

## 1.2.0

### Minor Changes

- 3058e3d: When a step's target is removed from the DOM while its step is showing, the tour now freezes the presentation in place for a short grace period and resumes on the target without a re-entrance animation if it reconnects, instead of immediately unmounting and replaying the appear animation. When the target reappears somewhere else, the cutout is animated to its new box rather than snapping, unless the step opts out of animation. Interaction with the underlying page stays blocked during the freeze even when `allowInteraction` is `true`. If the target doesn't come back within the grace period, `missingTargetStrategy` and `targetTimeout` apply exactly as before — the grace period counts against `targetTimeout` rather than extending it. Under `wait` the presentation stays frozen and the tour stays `active` for the whole budget, so the popover's buttons keep working instead of going dead behind a `transitioning` status.

## 1.1.0

### Minor Changes

- 165797b: `allowScroll` now defaults to `true`: the page stays scrollable while a tour runs. Pass `allowScroll: false` to keep the previous scroll-lock behaviour.

## 1.0.2

### Patch Changes

- 5aa8cdf: Fix two mobile overlay defects.
  
  The backdrop no longer stops short of the bottom of the screen. Its `viewBox` is
  now measured from the element's own box instead of `documentElement.clientHeight`,
  which a retracting mobile URL bar moves out of step with the box a fixed element
  is sized against; `preserveAspectRatio="xMinYMin slice"` makes any residual mismatch
  overdraw rather than letterbox, and the element is sized to `100lvh` where that
  unit exists so it always spans the visible area.
  
  The cutout now animates on WebKit. Safari — and therefore every browser on iOS —
  cannot animate `d` through the Web Animations API, so the rectangle is
  interpolated frame by frame and the path regenerated from it, clocked by the
  eased progress of the animation already running on the same element, instead of
  snapping to each target.

## 1.0.1

### Patch Changes

- 358c4b1: Draw the overlay backdrop on WebKit. The cutout geometry was only written to the CSS `d` property, which Safari does not implement — so on macOS Safari and on every iOS browser (Chrome and Firefox included, both WebKit) the backdrop never drew and tours ran with a popover but no dimming. The `d` attribute is now the source of truth, with the CSS property mirrored where it exists so the cutout still morphs between steps.
  
  Measure the viewport as the layout viewport (`documentElement.clientWidth/clientHeight`) instead of `innerWidth`/`innerHeight`. The latter reports the visual viewport, which shrinks with a mobile URL bar and includes a classic desktop scrollbar; the resulting mismatch with the overlay's own `100%`-sized box scaled and centred the backdrop, leaving undimmed bands and a cutout offset from its target. The same measurement backs popover clamping and the pointer's in-viewport checks.

## 1.0.0

### Major Changes

- e6da5bf: GlowTour.js V.1.0.0 release
