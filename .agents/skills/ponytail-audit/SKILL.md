---
name: ponytail-audit
description: >
  Whole-repo audit for over-engineering.
  Scans the entire codebase and returns a ranked list of what to delete, simplify,
  or replace with stdlib/native equivalents.
---

Repo-wide version of `ponytail-review`.
Scan the whole tree instead of a diff.

## Tags

- `delete`: dead code, unused flexibility, speculative feature
- `stdlib`: hand-rolled thing the standard library already ships
- `native`: dependency or code doing what the platform already does
- `yagni`: abstraction with one implementation, config nobody sets, layer with one caller
- `shrink`: same logic, fewer lines

## Hunt

- deps the stdlib or platform already ships
- single-implementation interfaces
- factories with one product
- wrappers that only delegate
- files exporting one thing without enough value
- dead flags and config
- hand-rolled stdlib

## Output

One line per finding, ranked biggest cut first.
End with `net: -N lines, -M deps possible.`
If there is nothing to cut, say `Lean already. Ship.`

## Boundaries

Scope: over-engineering and complexity only.
Correctness, security, and performance are out of scope.
Do not apply fixes, only list them.
