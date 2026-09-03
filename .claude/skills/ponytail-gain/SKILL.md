---
name: ponytail-gain
description: >
  Show Ponytail's published benchmark impact as a compact scoreboard.
  One-shot display, not a persistent mode and not a per-repo metric.
---

# Ponytail Gain

Display the published benchmark scoreboard when invoked.
Do not change mode or persist anything.

## Output

Render a compact ASCII scoreboard for:

- lines of code saved
- cost reduction
- speed improvement

These numbers are benchmark figures from Ponytail, not measurements of the current repo.

## Boundaries

Never invent a per-repo savings number.
Point to `ponytail-debt` for repo-specific tracked shortcuts instead.
