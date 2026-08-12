---
name: migration
description: Use for incremental migrations, upgrades, compatibility work, data-safe transitions, and rollback-aware sequencing.
---

# Migration

Use this skill for migrations and upgrades.

## Rules

- Keep migrations narrow and behavior-preserving unless the accepted goal requires behavior change.
- Separate mechanical changes from semantic changes.
- Maintain compatibility during transition when users or deployed environments can observe both states.
- Define rollback expectations before irreversible changes.
- Do not bundle unrelated refactors into migration work.

## Verification

- Test old and new behavior where compatibility matters.
- Document manual migration steps, data assumptions, and cleanup timing when relevant.
