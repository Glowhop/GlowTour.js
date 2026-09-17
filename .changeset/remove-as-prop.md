---
"@glowhop/react-tour": minor
"@glowhop/solid-tour": minor
---

Remove the `as` prop from the popover, pointer, and footer.

**Breaking changes**

- React and Solid: `GlowTourPopover`, `GlowTourPointer`, and `GlowTourFooter` no longer accept `as`. They always render a `<section>`, a `<div>`, and a `<footer>`, the elements the tour binds its positioning, focus, and ARIA behavior to, as in the Vue, Angular, and Vanilla adapters. On the footer, `as` never had an effect: React forwarded it to the `<footer>` as an invalid attribute, and Solid ignored it. Style the components with `className` (Solid: `class`) and `style`, or put your own element inside them.
