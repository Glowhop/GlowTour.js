---
name: frontend-guidelines
description: Use for React, Next.js, HeroUI, Tailwind, component composition, styling, and user-facing behavior.
---

# Frontend Guidelines

Apply these rules to frontend implementation, review, accessibility, testing, and performance work.

## Component Rules

- Prefer HeroUI components when they cover the use case.
- Do not add custom styles to library components unless the user explicitly asks or a documented gap requires it.
- Favor library props, variants, slots, and theme tokens over ad hoc CSS.
- Split UI into focused components with clear props and ownership.
- Keep server/client boundaries explicit in Next.js.
- Avoid exotic Tailwind or CSS utility classes such as arbitrary `tracking-[]` values unless there is a concrete design requirement.

## Behavior

- Do not invent backend contracts or data semantics from UI needs.
- Include loading, empty, error, disabled, and success states when they are part of the user behavior.
- Keep accessibility and responsive behavior in scope for visible UI changes.
