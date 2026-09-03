---
name: coding-guidelines
description: Use for all code changes and reviews to enforce strict TypeScript, minimal scope, safe edits, and targeted verification.
---

# Coding Guidelines

Apply these rules to every implementation, refactor, debug fix, and review.

## Rules

- Use TypeScript strict patterns.
- Do not use `any`. Prefer precise types, `unknown` with narrowing, or generics with constraints.
- Keep changes targeted and minimal.
- Do not modify files outside the requested scope unless the dependency is necessary and explicitly explained.
- Preserve existing conventions before introducing new patterns.
- Split code into focused modules or components when a file mixes unrelated responsibilities.
- Document important decisions when they affect architecture, public behavior, interfaces, migrations, security, or release process.
- Add or propose tests when a change affects business logic, user-visible behavior, integration contracts, auth, data flow, or regressions.

## Verification

- Run the smallest useful check available.
- If verification cannot run, state why and identify the missing check.
- Do not claim completion when behavior was not verified or at least reasoned through against acceptance criteria.
