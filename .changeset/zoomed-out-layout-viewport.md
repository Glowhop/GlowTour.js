---
"@glowhop/core-tour": patch
---

Keep the tour aligned on a phone page that is wider than the device and can be zoomed out. The browser then grows the layout viewport past the initial containing block: the overlay stopped short of the bottom of the screen, leaving an undimmed band, and the popover was placed and clamped against the smaller device-width box. The overlay now spans the taller of `100%` and `100lvh`, and placement measures the box `position: fixed` elements actually use.
