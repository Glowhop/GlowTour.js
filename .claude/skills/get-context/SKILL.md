---
name: get-context
description: "Clarify or confirm a concise design or product brief before moving into design, planning, or build work."
---

# Get Context

Use this skill at the start of a design or product request when the goal, reference, or expected fidelity is still unclear.

This skill resolves the brief. It does not implement UI, write production code, or create durable artifacts beyond a short brief.

## When To Use

Run this skill when any of the following are unclear:

- what product, feature, workflow, component, or screen is being discussed
- what existing design, app, screenshot, URL, or visual source should guide the work
- what style, constraints, or avoidances should shape the direction if no source exists
- what level of interactivity or completeness is expected

If the user already gave enough detail, do not re-ask answered questions. Play back the brief concisely and identify the next workflow.

## Hard Boundary

Do not implement UI, scaffold code, start a server, or create files while the brief is still unresolved.

## Context Sources

Ground the brief in the current repository when useful:

- `AGENTS.md`
- `DESIGN.md` if it exists
- relevant product docs or specs
- relevant UI files or screenshots already present in the workspace

Do not inspect unrelated files.

## Get Context Script

Adapt the wording, but resolve these three questions:

> What do you want the thing to do?

> What existing product, design system, screenshot, URL, image, or other visual source should it match? If none, what look are you going for?

> What level of interactivity or fidelity do you expect?

Suggested modes:

- `Full interactivity`: all controls and states are expected to behave realistically.
- `Static`: mostly presentation-oriented, with minimal interactivity.
- `Planning only`: no implementation yet; produce direction, documentation, or requirements only.

After the questions, reply with a short design or product brief. Keep it tight.

Example:

```text
Before moving forward, I need a short brief.

What should this screen or flow do?
What existing design, app, screenshot, or URL should it match? If none, what direction should it take?
Do you want a fully interactive result, a mostly static mock, or planning/documentation only?
```

## Final Message

Before any downstream design, planning, or build workflow:

1. Confirm the brief back to the user in a short, concrete format.
2. Proceed only once the brief is confirmed, unless the thread already contains confirmation for that exact brief.

Done means the brief is clear enough that the next workflow can proceed without guessing.
