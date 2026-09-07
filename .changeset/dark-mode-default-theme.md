---
"@glowhop/styles-tour": minor
---

Ship a dark palette in the default theme.

`default.css` now declares its tokens instead of only reading them as `var()` fallbacks,
and redefines the colour tokens for dark. The tour follows `prefers-color-scheme` out of
the box; `data-glow-tour-theme="light" | "dark"`, read on `:root` or on the tour root
itself, forces one regardless of the OS.

Tokens are declared on `:where(:root)` at zero specificity, so every documented way of
re-theming keeps working unchanged: an override on any ancestor of the tour wins by
proximity, and an override on `:root` wins on specificity.

New token: `--glow-tour-overlay-color` (backdrop fill). The backdrop's opacity stays a
per-step option (`overlay.opacity`), not a CSS token.
