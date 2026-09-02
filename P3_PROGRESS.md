# P3 Core Progress

Branch: `codex/p3-core-contracts`
Source: `AUDIT_CORE.md`, section “Constats P3”

| Finding | Scope | Status | Verification |
| --- | --- | --- | --- |
| P3 #8 | Terminal state after `dispose()` | Not started | — |
| P3 #9 | Executable Core adoption guide | Not started | — |
| P3 #11 | DOM ownership and CSP nonce | Not started | — |

## Excluded

P3 #10 is already implemented: `StepPropsStore` is a local public interface backed by an internal store. Its published type contract remains covered by package-consumer tests.

## Decisions

- `state.get()` remains readable after disposal.
- Existing subscribers receive one final `disposed` snapshot.
- Subscriptions created after disposal remain no-ops.
- Commands reject after disposal.
- DOM values are restored only while Core still owns their current value.
- Arrow stylesheet injection accepts an optional CSP nonce.

## Verification log

- Baseline: `bun test` — 373 passed, 0 failed.
