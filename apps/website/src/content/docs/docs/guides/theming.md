---
title: Theming guide
description: Customize the appearance of GlowTour.js with CSS custom properties.
---

GlowTour.js provides a complete default theme via `@glowhop/styles-tour/default.css`, in light and dark. All colors, spacing, sizing, and transitions are defined as CSS custom properties and can be overridden to match your brand.

## CSS custom properties

The following properties control the tour's appearance. Override them in your stylesheet or inline style.

:::note
All the properties below are only *read* inside `@glowhop/styles-tour/default.css` itself - they have no effect unless you actually import that stylesheet (or redefine the same selectors yourself). The [arrow properties](#arrow) are the exception: `@glowhop/core-tour` injects their rules itself, so they work regardless of which theme, or no theme, you use.
:::

### Colors

| Property | Light | Dark | Purpose |
| --- | --- | --- | --- |
| `--glow-tour-color-accent` | `#4c35fd` | `#6d5bff` | Primary action buttons and interactive elements |
| `--glow-tour-color-accent-hover` | `#3f2be0` | `#5d4bf0` | Hover state of the advance button |
| `--glow-tour-color-accent-active` | `#3522c7` | `#4f3ce0` | Active state of the advance button |
| `--glow-tour-color-on-accent` | `#ffffff` | `#ffffff` | Text on top of the accent |
| `--glow-tour-color-surface` | `#ffffff` | `#1c1c21` | Popover background |
| `--glow-tour-color-surface-muted` | `#f6f6f7` | `#26262d` | Hover and disabled backgrounds |
| `--glow-tour-color-text` | `#1f1f23` | `#f2f2f4` | Primary text color |
| `--glow-tour-color-text-muted` | `#5f5f66` | `#a8a8b3` | Secondary text and muted content |
| `--glow-tour-color-border` | `#dedee3` | `#3a3a44` | Popover border and dividers |
| `--glow-tour-overlay-color` | `#000000` | `#000000` | Backdrop fill - see the note under [Dark mode](#dark-mode) |

### Spacing and sizing

| Property | Default | Purpose |
| --- | --- | --- |
| `--glow-tour-spacing` | `8px` | Base spacing unit (buttons, gaps, padding) |
| `--glow-tour-popover-width` | `352px` | Popover max-width |
| `--glow-tour-control-height` | `32px` | Height of navigation buttons |
| `--glow-tour-viewport-gap` | `16px` | Minimum gap from popover to viewport edges |

### Styling

| Property | Default | Purpose |
| --- | --- | --- |
| `--glow-tour-radius` | `8px` | Border radius for popover and buttons |
| `--glow-tour-shadow` | `0 4px 12px rgb(0 0 0 / 8%)` in light, `0 8px 24px rgb(0 0 0 / 56%)` in dark | Popover box shadow |
| `--glow-tour-transition-duration` | `120ms` | Hover/state color-transition duration for the Cancel/Previous/Advance buttons - not the popover's fade/slide, which is a separate JS-driven animation (see the `animation` option, default 180ms, in the [Builder reference](/docs/reference/builder#animation-options)) |
| `--glow-tour-transition-easing` | `ease-out` | Easing function for that same button color transition |

### Arrow

The arrow is a rotated square drawn as a `::before` pseudo-element on the popover. Unlike
every other property on this page, these are injected by `@glowhop/core-tour` itself, so
they apply with no stylesheet imported.

| Property | Default | Purpose |
| --- | --- | --- |
| `--glow-tour-arrow-color` | `--glow-tour-color-surface`, else `#ffffff` | Arrow fill, normally matching the popover background |
| `--glow-tour-arrow-border-color` | `--glow-tour-color-border`, else `#dedee3` | Arrow border, normally matching the popover border |
| `--glow-tour-arrow-border-width` | `1px` | Arrow border width |
| `--glow-tour-arrow-border-radius` | `0px` | Rounding of the arrow tip |
| `--glow-tour-arrow-size` | `12px` | Width and height of the square before rotation |

`--glow-tour-arrow-offset` is **not** in that list: the core computes it on every
reposition and writes it inline to centre the arrow on the target. It is an output, not a
setting, and any value you assign is overwritten on the next frame.

:::caution
Four of these five have a JavaScript equivalent under `popover.arrow` in the
[Builder reference](/docs/reference/builder#arrow-options). Those options are written as
inline custom properties, so they **win over your stylesheet** for the same property. Set a
given property in one channel or the other, not both. `--glow-tour-arrow-border-color` has
no JS equivalent and is only settable from CSS.
:::

To change the arrow's *shape* rather than its values, set `popover.arrow.disableAutoStyles`
to skip the injected rules entirely and write your own. The popover carries a
`data-glow-tour-placement` attribute, and the computed `--glow-tour-arrow-offset`, to
position whatever you draw.

## Customizing the theme

Override properties in a CSS file after importing the default theme. The tokens are
declared at zero specificity on `:where(:root)`, so an override on `:root`, on the tour
root, or on any element that contains the tour all take precedence:

```css
@import "@glowhop/styles-tour/default.css";

:where([data-glow-tour-root]) {
  --glow-tour-color-accent: #00d9ff;
  --glow-tour-color-surface: #1a1a2e;
  --glow-tour-color-text: #f0f0f0;
  --glow-tour-color-text-muted: #a0a0a8;
  --glow-tour-color-border: #2a2a3e;
  --glow-tour-radius: 12px;
  --glow-tour-spacing: 12px;
}
```

Or in a regular CSS file:

```css
:where([data-glow-tour-root]) {
  --glow-tour-color-accent: #ff6b6b;
  --glow-tour-color-surface: #ffffff;
  --glow-tour-radius: 16px;
}
```

## Dark mode

The default theme ships both palettes. With nothing to configure, the tour follows
the operating system preference through `prefers-color-scheme`.

To force one theme regardless of the OS - because your app has its own theme switch -
set `data-glow-tour-theme` to `light` or `dark`:

```html
<html data-glow-tour-theme="dark">
```

The attribute works on **any** element, not just `:root`. Tokens inherit, so putting it
on `<html>` themes every tour on the page, while putting it on a wrapper themes only the
tour inside it - which is what lets a single dark example sit on an otherwise light page:

```tsx
<div data-glow-tour-theme="dark">
  <GlowTour.Default tour={tour} />
</div>
```

The nearest ancestor carrying the attribute wins, so a wrapper can opt back into light
inside a dark page.

:::caution
The nearest element also wins for the tokens themselves. If you override a token on an
ancestor and then place a `data-glow-tour-theme` wrapper *between* that override and the
tour, the wrapper's palette replaces your value. Override at or below the themed element
to keep it.
:::

### What the dark palette changes, and what it does not

Elevation moves from the shadow to the border. A drop shadow over a dark ground is
close to invisible whatever its opacity, so in dark the border does the work of
separating the popover from the page.

The backdrop keeps the same black fill in both themes - it dims the page, it does not
tint it. Its **opacity** is written inline by the core on every frame and is therefore
not reachable from CSS; if 70% black is too heavy over your dark UI, set it per step:

```ts
.step({ /* … */, overlay: { opacity: 0.5 } })
```

### Why not `light-dark()`

`light-dark()` resolves against the `color-scheme` property, which belongs to the host
page: when `color-scheme` is unset - which is the case in most apps - it returns the
light value even on a dark OS. Keying off a media query and an attribute of our own
keeps the default correct without depending on a property your app uses for its own
theme, and without raising the library's browser floor.

Nothing stops you from using it in *your* tokens, though - you control your own
`:root`, so the constraint does not apply:

```css
:root {
  color-scheme: light dark;
  --glow-tour-color-surface: light-dark(#ffffff, #10101a);
  --glow-tour-color-text: light-dark(#1f1f23, #f0f0f0);
}
```

### Contrast

The palettes are provided as a sensible default, not as a certified one. If you ship
your own tokens, or place the tour over a busy background, check the contrast of
`--glow-tour-color-text`, `--glow-tour-color-text-muted` and
`--glow-tour-color-on-accent` against their surfaces yourself. See the
[accessibility notes](/docs/guides/accessibility) for what the library does and does
not guarantee.

## Advanced customization

For complete control over the popover layout, header styling, or footer layout, you can use custom composition and write your own styles:

```tsx
import { GlowTour, createGlowTour } from "@glowhop/react-tour";
import "./custom-tour.css";

const tour = createGlowTour();

export function CustomStyledTour() {
  return (
    <GlowTour.Root tour={tour}>
      <GlowTour.Overlay />
      <GlowTour.Pointer />
      <GlowTour.Popover className="my-custom-popover">
        <GlowTour.Header className="my-custom-header" />
        <GlowTour.Content className="my-custom-content" />
        <GlowTour.Footer className="my-custom-footer">
          <GlowTour.CancelTrigger />
          <GlowTour.AdvanceTrigger />
        </GlowTour.Footer>
      </GlowTour.Popover>
    </GlowTour.Root>
  );
}
```

Then apply your styles:

```css
.my-custom-popover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 20px;
}

.my-custom-header {
  font-size: 1.25rem;
  font-weight: 700;
}

.my-custom-footer {
  gap: 12px;
}
```

The default theme uses CSS custom properties and `:where()` selectors for minimal specificity, making it easy to override.
