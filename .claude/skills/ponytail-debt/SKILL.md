---
name: ponytail-debt
description: >
  Harvest every `ponytail:` comment in the codebase into a debt ledger,
  so deliberate shortcuts and deferrals stay visible.
---

Collect every deliberate `ponytail:` shortcut into one ledger.

## Scan

Search the repo for comment markers containing `ponytail:`.
Skip `.git`, dependency folders, and build output.

## Output

One row per marker, grouped by file:
`path:line, shortcut. ceiling: X. upgrade: Y.`

Flag any marker with no upgrade path or trigger as `no-trigger`.
End with `N markers, M with no trigger.`
If nothing is found, say `No ponytail: debt. Clean ledger.`

## Boundaries

Read and report only. To persist a ledger file, do it only if explicitly asked.
