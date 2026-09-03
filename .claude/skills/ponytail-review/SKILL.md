---
name: ponytail-review
description: >
  Code review focused exclusively on over-engineering.
  Finds what to delete: reinvented standard library, unneeded dependencies, speculative abstractions, dead flexibility.
  One line per finding: location, what to cut, what replaces it.
---

Review diffs for unnecessary complexity.
One line per finding: location, what to cut, what replaces it.

## Format

`Lx: tag: what to cut. replacement.`

Tags:

- `delete`: dead code, unused flexibility, speculative feature
- `stdlib`: hand-rolled thing the standard library already ships
- `native`: dependency or code doing what the platform already does
- `yagni`: abstraction with one implementation, config nobody sets, layer with one caller
- `shrink`: same logic, fewer lines

## Output

End with `net: -N lines possible.`
If there is nothing to cut, say `Lean already. Ship.` and stop.

## Boundaries

Scope: over-engineering and complexity only.
Correctness, security, and performance are out of scope.
A single smoke test or small self-check is not bloat.
Do not apply fixes, only list them.
