---
name: backend-guidelines
description: Use for server logic, API contracts, validation, persistence, auth boundaries, and backend data flow.
---

# Backend Guidelines

Apply these rules to backend implementation, review, debugging, performance, security, and testing.

## Rules

- Keep transport, validation, business logic, persistence, and utilities separated.
- Treat API contracts as explicit interfaces with stable request, response, error, and auth behavior.
- Validate untrusted input at the boundary.
- Keep authn, authz, tenant boundaries, and sensitive data handling explicit.
- Prefer targeted schema or data-flow changes over broad rewrites.
- Provide frontend integration notes when payloads, field meanings, auth constraints, or failure modes change.

## Verification

- Add or propose focused tests for business rules, contracts, auth behavior, persistence, and regressions.
- If data migration is involved, define compatibility and rollback expectations before changing behavior.
