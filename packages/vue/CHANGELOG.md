# @glowhop/vue-tour

## 1.3.1

### Patch Changes

- @glowhop/core-tour@1.3.1

## 1.3.0

### Patch Changes

- Updated dependencies [b38bc4a]
  - @glowhop/core-tour@1.3.0

## 1.2.0

### Patch Changes

- Updated dependencies [3058e3d]
  - @glowhop/core-tour@1.2.0

## 1.1.0

### Patch Changes

- Updated dependencies [165797b]
  - @glowhop/core-tour@1.1.0

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
- Updated dependencies [5aa8cdf]
  - @glowhop/core-tour@1.0.2

## 1.0.1

### Patch Changes

- Updated dependencies [358c4b1]
  - @glowhop/core-tour@1.0.1

## 1.0.0

### Major Changes

- e6da5bf: GlowTour.js V.1.0.0 release

### Patch Changes

- Updated dependencies [e6da5bf]
  - @glowhop/core-tour@1.0.0
