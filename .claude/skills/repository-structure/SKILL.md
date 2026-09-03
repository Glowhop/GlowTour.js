---
name: repository-structure
description: Use when navigating, changing, documenting, or reviewing repository layout and ownership boundaries.
---

# Repository Structure

Use this skill before changing project structure, adding files, or routing work.

## Rules

- Inspect the existing repository layout before choosing where code or docs belong.
- Keep files close to the feature or subsystem they support.
- Do not create catch-all files that mix routing, business logic, persistence, UI, tests, and utilities.
- Keep public interfaces discoverable and avoid duplicate sources of truth.
- Preserve local `AGENTS.md`, `.codex`, and project conventions when present.
- Do not move files unless the move directly supports the requested task.

## Handoff

- If the structure is ambiguous, document the competing options and recommend the smallest coherent structure.
- If a structural decision affects future work, record it in the relevant documentation or decision note.
