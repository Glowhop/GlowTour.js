---
"@glowhop/react-tour": minor
"@glowhop/solid-tour": minor
---

Remove the `as` prop from the footer, which never had an effect.

**Breaking changes**

- React and Solid: `GlowTourFooter` no longer accepts `as`. It always rendered a `<footer>`: React forwarded `as` to that element as an invalid attribute, and Solid ignored it. Remove the prop, or wrap the footer's content in your own element. `GlowTourPopover` and `GlowTourPointer` keep their `as` prop.
