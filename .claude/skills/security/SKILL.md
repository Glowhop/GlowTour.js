---
name: security
description: Use for auth, authorization, tenant isolation, secrets, injection, unsafe trust boundaries, data exposure, and realistic vulnerability review.
---

# Security

Use this skill for security-sensitive implementation, review, and remediation.

## Rules

- Distinguish correctness bugs from real vulnerabilities.
- Require a credible attacker, reachable path, and meaningful impact before assigning severity.
- Treat authn, authz, tenant isolation, secrets, injection, deserialization, SSRF, XSS, CSRF, and data exposure as high-attention areas.
- Validate all untrusted input at the boundary.
- Do not log secrets, tokens, credentials, payment data, or sensitive personal data.
- Keep fixes focused on the actual risk.

## Output

- State the threat model.
- State exploitability and impact.
- State the smallest safe remediation and verification.
