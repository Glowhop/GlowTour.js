---
name: devops
description: Use for CI, deployment, environments, operational safety, permissions, and infrastructure workflow changes.
---

# DevOps

Use this skill for delivery and operational workflow work.

## Rules

- Keep CI and deployment changes minimal, explicit, and auditable.
- Preserve local developer workflows unless the task requires changing them.
- Treat secrets, credentials, tokens, and permissions as security-sensitive.
- Avoid broad infrastructure rewrites for narrow release or CI needs.
- Document required environment variables without exposing secret values.
- Prefer reversible deployment changes and clear rollback notes.

## Verification

- Identify the command, job, or workflow that validates the change.
- If the workflow cannot run locally, state the expected remote validation.
