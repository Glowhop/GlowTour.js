---
name: design-spec-writer
description: Write or update a frontend-ready DESIGN.md from a brief, an existing DESIGN.md, a live URL, screenshots, or visual mockups. Use when the goal is a pixel-accurate design handoff that frontend can implement with minimal ambiguity.
---

# Product Design Design Spec Writer

Use this skill when the user wants a strong design handoff document rather than a loose design summary.

The output is a `DESIGN.md` that acts as an implementation contract for frontend.

## Goals

- Convert messy inputs into a precise design spec.
- Separate `observed`, `inferred`, and `open questions`.
- Prefer measurable statements over adjectives.
- Make frontend uncertainty explicit instead of hiding it.

## When To Use

Use this skill when the user asks to:

- write or update `DESIGN.md`
- derive a design spec from a URL
- derive a design spec from screenshots or mockups
- prepare a pixel-perfect frontend handoff
- compare an existing implementation to a target visual and document the gap

## Inputs

Possible inputs:

- a product or feature brief
- an existing `DESIGN.md`
- one or more URLs
- one or more screenshots, mockups, or images
- an existing codebase

If the source is primarily a live page, also read the URL analysis skill:
`../url-to-design-spec/SKILL.md`

If the source is primarily an image or mockup, also read the image analysis skill:
`../image-to-design-spec/SKILL.md`

## Workflow

1. Identify the source of truth.
2. Gather evidence from the provided materials.
3. Mark every important statement as one of:
   - `Observed`: directly visible in the source
   - `Inferred`: highly likely but not directly confirmed
   - `Open question`: required for pixel-accurate implementation but still unknown
4. Normalize the design into implementation-ready sections.
5. Write or update `DESIGN.md`.
6. Run a final ambiguity pass and remove vague language.

## Non-Negotiable Rules

- Do not write phrases like `nice spacing`, `large heading`, `clean card`, `modern feel`.
- Replace subjective wording with concrete values or comparison rules.
- If a value is unknown, say that it is unknown and propose the safest assumption.
- Document responsive behavior explicitly. Never assume desktop-only behavior is enough.
- Document interaction states explicitly. Static screenshots are not enough.
- If multiple screens or components conflict, state which source wins.

## Required Sections

Read the template before writing:
`../../references/design-md-template.md`

Every `DESIGN.md` should contain, when relevant:

- `Objective`
- `Source of truth`
- `Scope`
- `Layout and grid`
- `Spacing`
- `Typography`
- `Colors and surfaces`
- `Components and variants`
- `Interaction states`
- `Responsive behavior`
- `Motion`
- `Assets and iconography`
- `Accessibility constraints`
- `Open questions and assumptions`
- `Acceptance checklist`

## Writing Rules

- Prefer short declarative sentences.
- Prefer exact values when available: `16px`, `max-width: 1200px`, `3-column grid`.
- When exact values are not available, define relative constraints:
  - `title baseline aligns with hero image top edge`
  - `card gap equals vertical gap between heading and summary`
- State component boundaries clearly:
  - what repeats
  - what is unique
  - what changes by breakpoint
  - what changes by state
