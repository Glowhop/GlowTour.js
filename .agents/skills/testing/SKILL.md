---
name: testing
description: Use for targeted tests, regression coverage, behavior verification, and deciding when tests are required.
---

# Testing

Use this skill when implementation changes behavior, contracts, data flow, business logic, or user-visible results.

## Rules

- Prefer focused tests that prove the changed behavior.
- Cover regressions, edge cases, error paths, auth boundaries, and integration seams when relevant.
- Do not add brittle tests that only mirror implementation details.
- Keep fixtures minimal and readable.
- For UI behavior, test user-observable outcomes rather than component internals.
- For backend behavior, test contracts, validation, authorization, persistence, and failure modes.

## Output

- State which tests were added or should be added.
- State which verification command was run or why it could not run.
