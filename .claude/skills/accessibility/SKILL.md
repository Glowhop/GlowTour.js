---
name: accessibility
description: Use for UI accessibility checks involving semantics, keyboard support, focus, labels, contrast, motion, and assistive technology behavior.
---

# Accessibility

Apply this skill to user-facing UI changes and reviews.

## Rules

- Prefer semantic HTML and accessible library components before adding ARIA.
- Ensure every interactive control has an accessible name.
- Preserve keyboard navigation and visible focus states.
- Check focus order, modal focus trapping, escape behavior, and restoration when relevant.
- Verify color contrast and do not rely on color alone.
- Respect reduced-motion needs for animations.
- Keep accessibility fixes aligned with HeroUI patterns by default. If a generated project explicitly adopts another UI library, follow that library's accessibility patterns.

## Output

- Describe the accessibility risk.
- Name the user impact.
- Recommend the smallest compliant change.
