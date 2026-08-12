---
name: image-to-design-spec
description: Analyze screenshots, mockups, or visual references and extract the layout, design tokens, component structure, and visible states needed to write or update a frontend-ready DESIGN.md.
---

# Product Design Image To Design Spec

Use this skill when the source is a static visual rather than a live page.

This skill turns screenshots or mockups into structured design evidence. It is especially useful when the team has a reference image but no reliable written spec.

## Recommended Pairing

After analysis, hand the result to:
`../design-spec-writer/SKILL.md`

## Goals

- Extract design intent from static visuals.
- Make implicit layout rules explicit.
- Avoid inventing behaviors that the image does not prove.
- Produce notes that can update a `DESIGN.md`.

## Inputs

- one or more screenshots
- a figma export or mockup
- optional existing `DESIGN.md`
- optional live implementation for comparison

## Workflow

1. Inspect the image at full resolution.
2. Identify the viewport type if possible: desktop, tablet, mobile.
3. Break the image into sections and components.
4. Estimate measurable relationships:
   - margins
   - paddings
   - gaps
   - column structure
   - image ratios
   - text hierarchy
5. Mark what is visible versus what is assumed.
6. List all missing behaviors that a static image cannot confirm.

## What To Extract

- layout frame and max-width clues
- grid and alignment rules
- spacing scale patterns
- typographic hierarchy
- component anatomy
- color and surface system
- icon style consistency
- visible states such as selected or expanded

## Static-Only Limits

A screenshot usually cannot confirm:

- hover state
- focus state
- animation timing
- scroll behavior
- drawer or modal transitions
- keyboard behavior

These must be tagged as `Unknown` or `Inferred`, never `Observed`.

## Evidence Rules

Use these tags in your notes:

- `Observed`: directly visible in the image
- `Inferred`: likely based on spacing systems, repeated patterns, or platform norms
- `Unknown`: impossible to verify from a static image

## Output Shape

Produce structured notes with these sections:

- `Image context`
- `Section-by-section observations`
- `Component inventory`
- `Typography observations`
- `Spacing and grid observations`
- `Visible states`
- `Inferred rules`
- `Unknown interaction and responsive behavior`

## Quality Bar

The analysis is incomplete if:

- it only describes the image at a high level
- it does not translate the visual into component rules
- it hides static-image uncertainty
- it ignores likely responsive implications

## Handoff