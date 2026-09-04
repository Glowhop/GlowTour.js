---
title: Theming guide
description: Customize Glow Tour's appearance with CSS custom properties.
---

Glow Tour provides a complete default theme via `@glowhop/styles-tour/default.css`. All colors, spacing, sizing, and transitions are defined as CSS custom properties and can be overridden to match your brand.

## CSS custom properties

The following properties control the tour's appearance. Override them in your stylesheet or inline style:

### Colors

| Property | Default | Purpose |
| --- | --- | --- |
| `--glow-tour-color-accent` | `#4c35fd` | Primary action buttons and interactive elements |
| `--glow-tour-color-surface` | `#ffffff` | Popover background |
| `--glow-tour-color-text` | `#1f1f23` | Primary text color |
| `--glow-tour-color-text-muted` | `#5f5f66` | Secondary text and muted content |
| `--glow-tour-color-border` | `#dedee3` | Popover border and dividers |

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
| `--glow-tour-shadow` | `0 4px 12px rgb(0 0 0 / 8%)` | Popover box shadow |
| `--glow-tour-transition-duration` | `120ms` | Fade/slide duration |
| `--glow-tour-transition-easing` | `ease-out` | Easing function for animations |

## Customizing the theme

Override properties in a CSS file after importing the default theme:

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

Glow Tour respects the system dark mode preference via `prefers-color-scheme`. You can provide different custom properties for light and dark modes:

```css
@media (prefers-color-scheme: light) {
  :where([data-glow-tour-root]) {
    --glow-tour-color-accent: #4c35fd;
    --glow-tour-color-surface: #ffffff;
    --glow-tour-color-text: #1f1f23;
  }
}

@media (prefers-color-scheme: dark) {
  :where([data-glow-tour-root]) {
    --glow-tour-color-accent: #00d9ff;
    --glow-tour-color-surface: #1a1a2e;
    --glow-tour-color-text: #f0f0f0;
  }
}
```

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
