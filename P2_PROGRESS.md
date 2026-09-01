# P2 Core Runtime — Progress

Branch: `codex/p2-core-runtime`

Baseline: 260 Core tests passing on commit `eb8f5b4`.

## Global Constraints

- Support same-origin documents and iframes through `root.ownerDocument.defaultView`.
- Keep `disableAdvanceButton` and `disablePreviousButton` presentation-only.
- Reuse `missingTargetStrategy` when an active target disconnects.
- Reject invalid options strictly; do not clamp them silently.
- Keep continuous RAF tracking, but skip stable rendering work.
- Do not introduce `ResizeObserver` in this change.
- Do not include P1 or P3 findings.
- Follow TDD: record RED and GREEN commands in each task report.

## Status

| Task | Description | Status | Commits | Review |
| ---: | --- | --- | --- | --- |
| 1 | Runtime option validation | Complete | `c412b3f` | Approved, no findings |
| 2 | Root-document target resolution | Complete | `6fcc08c` | Approved; 2 minor coverage notes |
| 3 | Realm-aware DOM driver | Complete | `1d5b333`, `3a718af` | Approved after fixes |
| 4 | Presentation-only button disabling | Complete | `1236a0a` | Approved, no findings |
| 5 | Active target disconnection recovery | Complete | `52c112d`, `58466af` | Approved after fix |
| 6 | Stable positioning short-circuit | Pending | — | — |
| 7 | Final verification | Pending | — | — |

## Decisions

- Invalid runtime values throw a `TypeError` containing the exact option path.
- A target must be a connected `HTMLElement` owned by the root document.
- Target recovery preserves dynamic props and does not replay step actions.
- On active target loss, `wait` retries until `targetTimeout`, `skip` follows the current direction, and `error` terminates the tour.
- Programmatic navigation remains available when a corresponding popover button is disabled.

---

### Task 1: Runtime option validation

Create `packages/core/src/options/validation.ts` and focused tests. Export `validateWorkflowOptions(workflow)` and `validateStepProps(path, props)`. Validate `targetTimeout`, animation durations, gaps, padding, radii, and arrow dimensions as finite non-negative numbers; validate opacity in `[0, 1]`. Run workflow validation before any `run()` state mutation. Validate dynamic props before freezing, assigning, or notifying. Remove numeric clamps from option merging. Error paths must identify global options or `steps[index]`. Run focused tests and Core typecheck, commit, self-review, and report RED/GREEN evidence.

### Task 2: Root-document target resolution

Make `root-bridge.assertCanRun()` return the connected root `Document`, capture it for each run, and pass it to `ActiveStep`. Change `resolveTargetElement` to accept `{ document?, signal }`: selectors query the supplied document; resolved values must be instances of that document's `HTMLElement`, belong to that document, and be connected. Detached valid elements resolve as missing; wrong types or realms throw a path-aware `TypeError`. Make `waitUntilElement` query `context.target.ownerDocument`. Add focused tests for selector isolation, detached targets, wrong realms, resolver results, and builder wait behavior. Run focused tests and typecheck, commit, self-review, and report RED/GREEN evidence.

### Task 3: Realm-aware DOM driver

Derive document, window, DOM constructors, keyboard/scroll listeners, RAF, cancellation, `MutationObserver`, focus, computed styles, viewport, DPR, and reduced-motion queries from the registered root or owned elements. Update `FocusGuard`, focus helpers, overlay, popover, pointer, and geometry helpers accordingly. Add `packages/core/src/core.browser.ts` with two Happy DOM realms while globals point to the other realm, and register it in `scripts/test-browser.ts`. Verify selector resolution, focus, keyboard navigation, and geometry in the root realm. Run focused unit tests, browser suites, and typecheck, commit, self-review, and report RED/GREEN evidence.

### Task 4: Presentation-only button disabling

Make `disableAdvanceButton` and `disablePreviousButton` affect only DOM controls and keyboard/click UI commands. Programmatic `tour.advance()`, `tour.previous()`, `tour.goToStep()`, and action-context navigation must remain available subject only to lifecycle state and bounds. Route navigation through one guarded internal transition path. Update public state expectations and add JSDoc clarifying presentation-only semantics. Preserve DOM tests proving disabled controls cannot trigger navigation. Run focused tests and typecheck, commit, self-review, and report RED/GREEN evidence.

### Task 5: Active target disconnection recovery

Extend internal driver commands with a target-disconnected notification. Before reading geometry, stop the current generation when the active target is disconnected or changes document. In the controller, ignore stale notifications; clear the view, preserve current props, avoid resetting/replaying actions, and reuse existing resolution policy. A recovered target returns the same step to `active`; `skip` enters the next step in the current direction; `error` or wait timeout uses normal failure handling. Add tests for wait/replacement, skip, error, stale notifications, preserved props, and actions executed exactly once. Run focused tests and typecheck, commit, self-review, and report RED/GREEN evidence.

### Task 6: Stable positioning short-circuit

Keep continuous RAF scheduling. Snapshot the target rectangle once per frame and return before overlay, popover, or pointer updates when it equals `lastTargetRect` and presentation is not dirty. A rectangle or props change must still perform one update. Update `lastTargetRect` and clear dirtiness only after successful synchronization. Add instrumentation tests for stable frames, movement, and props changes. Use the root realm RAF introduced by Task 3. Run focused tests and typecheck, commit, self-review, and report RED/GREEN evidence.

### Task 7: Final verification

Run `bun test packages/core/src`, `bunx tsc -p packages/core/tsconfig.json --noEmit`, `bun run test:browser`, `bun run check`, and `git diff --check`. Record exact results here. Do not change production behavior in this task; route failures back to the owning task. Obtain a whole-branch review before marking complete.

## Review Notes

- Task 1: independent review approved with no findings.
- Task 2: independent review approved. Final review should triage two minor coverage gaps: a resolver returning a non-HTMLElement/same-realm foreign-document element, and direct coverage of the real root-bridge document return path.
- Task 3: initial review found capability-gating and split-realm RAF defects; both were fixed in `3a718af`. Re-review approved with no remaining findings. Native iframe E2E remains outside scope; two-realm Happy DOM coverage passes.
- Task 4: independent review approved with no findings; programmatic and action-context navigation remain available while disabled DOM controls stay inert.
- Task 5: review found a stranded non-cancellable backward-skip boundary; `58466af` now fails that recovery with an indexed missing-target error. Re-review approved.
