---
"@glowhop/core-tour": patch
"@glowhop/react-tour": patch
"@glowhop/vue-tour": patch
"@glowhop/angular-tour": patch
"@glowhop/solid-tour": patch
---

Fix two mobile overlay defects.

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
