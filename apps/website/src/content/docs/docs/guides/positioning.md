---
title: Positioning guide
description: Control how the popover and indicator position relative to the target.
---

Glow Tour positions the popover and pointer (indicator) around the target element and automatically handles collisions with the viewport. You control which placements to try and in what order; Glow Tour picks the first one that fits.

## Placement options

Both the popover and pointer support a `placementTryOrder` array. Valid placements are:

- `top` - Above the target
- `bottom` - Below the target
- `left` - To the left of the target
- `right` - To the right of the target

If none of these fit within the viewport (considering the `viewport-gap`), the popover or pointer falls back to `center`.

## Popover placement

Control where the popover tries to appear relative to the target:

```typescript
const workflow = tour
  .create("placement-test")
  .step({
    target: "#feature",
    title: "Where's the popover?",
    content: "Try positioning it around the target.",
    popover: {
      placementTryOrder: ["right", "bottom", "left", "top"],
    },
  })
  .build();
```

The popover will try to render to the right of the target first. If that doesn't fit, it tries below, then left, then above. If none fit, it centers on the screen.

## Pointer placement

Control where the pointer/indicator tries to appear:

```typescript
const workflow = tour
  .create("pointer-placement")
  .step({
    target: "#button",
    title: "Indicator position",
    content: "The pointer indicates the target element.",
    indicator: {
      placementTryOrder: ["top", "right", "bottom", "left"],
    },
  })
  .build();
```

## Collision behavior

The `viewport-gap` property (default `16px`) sets the minimum distance between the popover/pointer and the viewport edges. When measuring if a placement fits, Glow Tour checks:

```
popover position + popover size + viewport-gap <= viewport edge
```

If a placement fails this check, the next placement in `placementTryOrder` is tried. If all placements fail, the popover/pointer centers on the screen.

## Center fallback

If all placements fail due to viewport constraints, the popover or pointer will center itself. You can customize the `viewport-gap` to adjust how aggressive the collision detection is:

```typescript
const tour = createGlowTour({
  popover: {
    placementTryOrder: ["bottom", "top", "right", "left"],
  },
  indicator: {
    placementTryOrder: ["top", "bottom", "right", "left"],
  },
});

// Reduce the gap to allow closer positioning to edges
const workflow = tour
  .create("tight-layout")
  .step({
    target: "#corner",
    title: "Tight space",
    content: "In this corner, we have minimal space.",
    popover: {
      placementTryOrder: ["right", "bottom"],
    },
  })
  .build();
```

## Default ordering

If you don't specify a `placementTryOrder`, the default is:

- Popover: `["bottom", "top", "right", "left"]`
- Pointer: `["top", "bottom", "right", "left"]`

These defaults are chosen to work well in most layouts but can be overridden per step or per tour.

## Practical example

Here's a tour that adapts its positioning to different UI elements:

```typescript
const workflow = tour
  .create("adaptive-tour")
  .step({
    target: "#header-logo",
    title: "Welcome",
    content: "Click the logo to return home.",
    popover: {
      placementTryOrder: ["bottom", "right", "left"],
    },
  })
  .step({
    target: "#sidebar-menu",
    title: "Navigation",
    content: "The menu is always available on the left.",
    popover: {
      placementTryOrder: ["right", "bottom", "top"],
    },
  })
  .step({
    target: "#main-content",
    title: "Your content",
    content: "This is where your data lives.",
    popover: {
      placementTryOrder: ["top", "bottom", "left", "right"],
    },
  })
  .build();
```

Each step tries different placements based on the region of the page it's in, ensuring the popover always has good space and doesn't obscure important content.

---

For a complete reference of all positioning options and their defaults, see [Popover options](/docs/reference/builder#popover-options) and [Indicator options](/docs/reference/builder#indicator-options) in the Builder reference.
