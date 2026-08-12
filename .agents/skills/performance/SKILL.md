---
name: performance
description: Use for measurable frontend or backend performance risks, bottlenecks, rendering cost, bundle impact, query cost, and caching tradeoffs.
---

# Performance

Use this skill when performance is part of the request or a concrete risk appears.

## Rules

- Measure or identify a plausible bottleneck before optimizing.
- Prefer targeted improvements over broad rewrites.
- For frontend, consider render frequency, hydration, bundle size, data fetching, image/media cost, and expensive client work.
- For backend, consider query shape, N+1 access, serialization, caching, validation overhead, and unnecessary network calls.
- Do not trade away correctness, security, accessibility, or maintainability for unproven speed.

## Verification

- State the expected performance effect.
- Use before/after checks when available.
- If measurement is unavailable, explain the proxy evidence and residual uncertainty.
