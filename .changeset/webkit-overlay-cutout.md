---
"@glowhop/core-tour": patch
---

Draw the overlay backdrop on WebKit. The cutout geometry was only written to the CSS `d` property, which Safari does not implement — so on macOS Safari and on every iOS browser (Chrome and Firefox included, both WebKit) the backdrop never drew and tours ran with a popover but no dimming. The `d` attribute is now the source of truth, with the CSS property mirrored where it exists so the cutout still morphs between steps.

Measure the viewport as the layout viewport (`documentElement.clientWidth/clientHeight`) instead of `innerWidth`/`innerHeight`. The latter reports the visual viewport, which shrinks with a mobile URL bar and includes a classic desktop scrollbar; the resulting mismatch with the overlay's own `100%`-sized box scaled and centred the backdrop, leaving undimmed bands and a cutout offset from its target. The same measurement backs popover clamping and the pointer's in-viewport checks.
