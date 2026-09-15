---
"@glowhop/core-tour": minor
"@glowhop/react-tour": minor
"@glowhop/vue-tour": minor
"@glowhop/solid-tour": minor
"@glowhop/angular-tour": minor
"@glowhop/vanilla-tour": minor
---

Use the same component names in every adapter.

**Breaking changes**

- React and Solid: every component takes the `GlowTour` prefix (`GlowTourRoot`, `GlowTourPopover`, `GlowTourHeader`, `GlowTourContent`, `GlowTourFooter`, `GlowTourOverlay`, `GlowTourPointer`, `GlowTourAdvanceTrigger`, `GlowTourCancelTrigger`), `DefaultTour` becomes `GlowTourDefault` and `DefaultTourProps` becomes `GlowTourDefaultProps`. The `GlowTour` namespace object is removed: import each component by name.
- All adapters: the back trigger becomes the previous trigger. `BackTrigger` / `GlowTourBackTrigger` become `GlowTourPreviousTrigger`, the Angular selector and Vanilla tag `glow-tour-back-trigger` become `glow-tour-previous-trigger`, and the `backLabel` prop (Vanilla `back-label` attribute) becomes `previousLabel` (`previous-label`).
- The default label of the previous trigger is "Previous step" instead of "Back step".
- Vanilla: `createDefaultTourElement()` and `CreateDefaultTourElementOptions` are removed. Use the `<glow-tour-default>` element, with its `tour` property and `id-prefix` attribute. The `VanillaGlowTour` type alias is removed: use `Tour`.

**Added**

- Vanilla `<glow-tour-default>` element and `GlowTourDefaultElement` type, registered with the other elements.
