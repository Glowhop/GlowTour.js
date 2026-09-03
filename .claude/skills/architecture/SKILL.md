---
name: architecture
description: Use for system design, module boundaries, data flow, tradeoff analysis, and decision records.
---

# Architecture

Use this skill when a change affects structure, boundaries, ownership, or long-term maintainability.

## Rules

- Start from the current repository structure and constraints.
- Prefer simple, explicit boundaries over generic abstraction.
- Keep architecture decisions tied to concrete risks or requirements.
- Define data flow, ownership, dependencies, and failure modes when they affect implementation.
- Avoid speculative extensibility.
- Document important decisions and the reason rejected alternatives were not chosen.

## Output

- State the recommended structure.
- State the tradeoffs.
- Identify the agents or implementation areas affected.
