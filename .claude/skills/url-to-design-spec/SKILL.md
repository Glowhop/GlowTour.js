---
name: url-to-design-spec
description: Analyze a live URL and extract the visual structure, component inventory, spacing patterns, typography hierarchy, responsive behavior, and visible interactions needed to write or update a frontend-ready DESIGN.md.
---

# Product Design URL To Design Spec

Use this skill when the source of truth is a live page or deployed preview.

This skill does not replace the final spec-writing step. Its role is to gather reliable design evidence from the URL and convert that evidence into structured notes that another skill can turn into `DESIGN.md`.

## Recommended Pairing

After analysis, hand the result to:
`../design-spec-writer/SKILL.md`

## Goals

- Inspect the live page instead of guessing from a brief.
- Capture layout, rhythm, components, and states.
- Distinguish visible facts from inferred behavior.
- Produce notes that are directly usable in a design handoff.

## Inputs

- one or more URLs
- optional existing `DESIGN.md`
- optional screenshots for comparison
- optional codebase for implementation cross-checks

## Tooling

Prefer a browser control skill or browser tooling that can:

- open the page
- inspect desktop and mobile layouts
- capture screenshots
- scroll and interact with the UI

If interaction is possible, inspect:

- hover and focus states
- sticky behaviors
- menus, drawers, tabs, accordions, and modals
- loading or skeleton states if visible

## Workflow

1. Open the URL.
2. Inspect the default desktop viewport.
3. Inspect at least one mobile viewport.
4. Capture the page structure section by section.
5. Inventory all visible components and repeating patterns.
6. Record measurable facts first.
7. Record inferred rules separately.
8. Flag missing information needed for a pixel-accurate spec.

## What To Capture

For each major section:

- approximate width and alignment
- number of columns
- section order
- padding and gap patterns
- background and surface treatment
- heading hierarchy
- primary and secondary actions
- image aspect ratios and crop behavior

For each interactive element:

- default appearance
- visible hover or focus behavior
- placement changes across breakpoints
- sticky or scroll-dependent behavior

## Evidence Rules

Use these tags in your notes:

- `Observed`: directly visible in the page or interaction
- `Inferred`: likely based on repeated patterns or common UI behavior
- `Unknown`: required but not recoverable from current inspection

Never promote `Inferred` to fact without evidence.

## Output Shape

Produce structured notes with these sections:

- `Page inventory`
- `Section-by-section observations`
- `Component inventory`
- `Responsive observations`
- `Interaction observations`
- `Inferred design rules`
- `Unknowns blocking pixel-perfect implementation`

## Quality Bar