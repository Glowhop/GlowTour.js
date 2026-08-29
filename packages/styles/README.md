# @glowhop/styles-tour

ESM-only CSS package. Import the light-only theme:

```ts
import "@glowhop/styles-tour/default.css";
```

Styles are scoped to `[data-glow-tour-root]`; tokens inherit from an ancestor:

```css
.onboarding { --glow-tour-color-accent: #0b6; --glow-tour-popover-width: 420px; }
```

| Token | Purpose |
| --- | --- |
| `--glow-tour-color-surface`, `--glow-tour-color-surface-muted` | surfaces |
| `--glow-tour-color-text`, `--glow-tour-color-text-muted`, `--glow-tour-color-border` | text and borders |
| `--glow-tour-color-accent`, `--glow-tour-color-accent-hover`, `--glow-tour-color-accent-active`, `--glow-tour-color-on-accent` | controls and focus |
| `--glow-tour-spacing`, `--glow-tour-radius`, `--glow-tour-shadow` | shape and spacing |
| `--glow-tour-popover-width`, `--glow-tour-viewport-gap`, `--glow-tour-control-height` | layout |
| `--glow-tour-transition-duration`, `--glow-tour-transition-easing` | motion |

Popover content scrolls inside the available height while its arrow remains visible.
