---
name: audit
description: "Audit or critique a product flow, screen, or UX path from concrete evidence, and report UX, design, and accessibility findings."
---

# Audit

Use this skill when the user asks to audit, review, critique, inspect, assess, analyze, evaluate, or give feedback on a product experience.

The output is evidence-based. It is not a loose opinion.

## Expected Output

- screenshots or other concrete evidence for the reviewed steps when available
- a numbered step list for the audited flow or surface
- UX and design findings tied to steps or evidence
- accessibility risks tied to steps or evidence
- clear limits on what could not be checked from the available evidence

## Scope

Use this for:

- a product flow or journey
- onboarding, checkout, settings, or other multi-step experiences
- a single screen when the request is bounded to that surface

Do not claim full accessibility compliance from screenshots alone.

## Context Sources

Use only the context needed for the audit:

- current screenshots or captures produced during the audit
- relevant local docs such as `AGENTS.md` or `DESIGN.md`
- the current app surface if it can be inspected directly

Do not use prior memory, old screenshots, or unrelated artifacts as audit evidence unless the user explicitly provides them.

## Route

Before auditing:

1. Identify the product or surface.
2. Identify the flow or task to inspect.
3. Identify where the output should go.
4. Choose the capture method if live inspection is needed.
5. Capture the flow or inspect the provided evidence.
6. Save, inspect, and annotate each accepted step.

If the destination is missing, ask one question:

```text
Should I put this audit in a local folder or keep it in the thread?
```

## Capture Rules

If live capture is needed:

- use the in-app browser first when available
- if that cannot access or control the target, use Chrome tooling
- if neither can capture valid evidence, stop and report the blocker

For each captured step:

1. Move to the next relevant step.
2. Wait for the screen to become stable.
3. Reject blank, loading, cropped, blocked, or wrong-state captures.
4. Save the accepted screenshot.
5. Inspect the saved file before relying on it as evidence.
6. Write notes tied to that step before moving on.

## Audit Framework

Follow [references/design-audit-framework.md](references/design-audit-framework.md) when deciding what to inspect and how to structure the findings.

For every step or surface reviewed, note:

- strengths
- UX risks or friction
- accessibility risks
- evidence limits
- recommendations

## Acceptance Checks

- every important step in scope has evidence or a named blocker
- findings point to a specific step, screenshot, or surface
- structural issues are separated from polish issues
- recommendations tie back to the user goal or accessibility outcome
- limitations are stated clearly where evidence is incomplete

## Final Response

List every reviewed step with:

- step number
- short description
- general health of that step

Also include where the full output was saved or whether it remains in-thread.

Keep the language direct.
