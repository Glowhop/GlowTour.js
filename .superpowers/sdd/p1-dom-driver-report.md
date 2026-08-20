# P1 DOM driver report

Status: focus-restoration reentrancy follow-up is GREEN and release-gate verified.

## RED evidence

- The initial focused test imported `happy-dom`, but Core could not resolve the adapter-only dependency. No dependency was added.
- The replacement local-DOM fixture then produced the intended RED: `DomTourViewDriver` was not exported from `packages/core/src/dom/tour-view-driver.ts`.
- Review follow-up RED: `bun test packages/core/src/dom/tour-view-driver.test.ts` reproduced five failures: 10px same-placement popover motion did not write geometry; nested contenteditable triggered navigation; pre-aborted show invoked scroll; stale show/clear continuations completed after a newer generation; and dispose left pending animations uncancelled.
- Second-review RED: the focused DOM/controller suite reproduced five failures: focus activation attached stale resources after a synchronous replacement; an async event callback navigated the replacement generation; `registerPopover(null)` retained focus trapping; denied Escape/ArrowLeft were consumed and cancel/back controls were not disabled; and Tab candidates accepted a CSS-hidden descendant instead of wrapping between native controls. A dedicated FocusGuard regression also failed to select native fallback candidates.
- Focus-order RED: a real `TourController` plus `DomTourViewDriver` two-step transition focused the popover fallback after advancing because the transition capability publication disabled the inherited next/back controls before `FocusGuard` chose its directional trigger.
- Focus-restoration RED: a controllable original focus element synchronously started B when `FocusGuard.deactivate()` restored it. Stale `show(A)` overwrote B’s current step, and stale `clear()` set it null/started disappearance, leaving B unable to receive keyboard navigation.

## Implementation

- Added internal `DomTourViewDriver<T>` with explicit root, overlay, popover, and pointer registration.
- `TourController` provides command callbacks through the internal driver boundary; the driver does not access controller state directly.
- Target resolution remains in `TourController`; tracking reads `ActiveStep.target` only.
- Resize/scroll/step updates coalesce into one rAF. Event tracking is the default; continuous tracking reschedules only after a completed frame.
- Cleanup owns listeners, one `ResizeObserver`, rAF, observable subscription, scroll timeout/abort handling, focus guard, and terminal disposal.
- Existing element geometry/animation helpers now accept the smaller structural `TourElementStep` contract, letting both legacy `WorkflowStep` and active runtime steps use the same helpers.
- Modal focus uses `FocusGuard` plus true forward/reverse Tab looping; `aria-modal` appears only when target interaction is forbidden.
- Scoped next/back click listeners and keyboard handlers use the same dynamic step flags; controller callbacks remain the final navigation/cancellation authority.
- Added one driver generation per show, clear, active registration refresh, and disposal. Stale completions reject with `AbortError`; abort signals cancel active element animations, and element wrappers suppress post-cancel continuations.
- Replaced `DOMRect` spreading with explicit finite geometry snapshots, so native prototype accessors remain valid through registration and invalidation comparisons.
- Replacing active root/overlay/popover/pointer wrappers releases old DOM state and animations, disconnects old resources, reobserves the new popover, rebinds scoped buttons, and refreshes `FocusGuard`.
- Popover geometry writes on every meaningful movement; the 50px threshold remains only for replacement animation choice.
- Escape is handled before editable navigation suppression but remains controller-authorized; next/back remain ignored for editable descendants. Modal Tab candidates exclude disabled, aria-disabled, hidden, inert, aria-hidden, display-none, and visibility-hidden controls.
- Workflow `animated: false`, reduced motion, and zero-duration pointer policy disable the continuous pointer animation without installing a global media-query listener.
- `show()` now verifies its lifecycle generation after focus activation, so a synchronous focus handler cannot leave stale listeners, observers, target handlers, or subscriptions behind.
- Event-handler commands are generation-bound no-ops after clear/replacement. Releasing an active popover deactivates and restores `FocusGuard`; registering a replacement reactivates it for the current active generation.
- The controller provides readonly `canAdvance`, `canPrevious`, and `canCancel` callbacks plus internal capability-change observation. Scoped next/back/cancel controls synchronize native `disabled` and `aria-disabled`; denied shortcuts remain unconsumed.
- `focusable.ts` is shared by modal Tab looping and `FocusGuard`, includes `summary`, `audio[controls]`, and `video[controls]`, and rejects hidden, inert, ARIA-hidden, and CSS-hidden ancestors.
- Controller-bound autofocus is deferred only until the active capability notification. That restores forward → next and backward → back focus ordering while controls and commands remain denied during transition; direct-driver autofocus and `disableAutoFocus` retain their existing behavior.
- `show()` and `clear()` now call `throwIfStale(generation, signal)` immediately after each restoring `FocusGuard.deactivate()`. A synchronous replacement therefore owns all subsequent state, resources, and DOM, while the stale operation rejects with `AbortError` and does not begin stale disappearance.

## Focused coverage

- resize/scroll rAF coalescing;
- unchanged rectangle write avoidance;
- events versus continuous tracking;
- clear/dispose idempotence and cleanup;
- editable/modifier/IME/prevented keyboard paths and permissions;
- directional modal focus, Tab/Shift+Tab loop, restoration, and `aria-modal` toggle;
- root-scoped trigger lookup plus replacement/detachment;
- abortable scroll.
- review lifecycle generation ordering with controllable `Animation.finished` promises;
- active element replacement and old resource release;
- pre/mid-operation abort cleanup, controller cancellation permission, and zero-duration pointer cleanup.

## Current verification

- Second-review focused DOM, FocusGuard, and controller suite: 62 passed, 0 failed.
- Focus-order focused DOM, FocusGuard, and controller suite: 63 passed, 0 failed.
- Focus-restoration focused DOM, FocusGuard, and controller suite: 65 passed, 0 failed.
- Focus-restoration `bun run check`: pass (93 files); `bun run typecheck`: pass with no diagnostics.
- Focus-restoration `bun test`: pass, 139 tests / 0 failures across 20 files.
- Focus-restoration build and pack: pass; exactly 7 distributions and 7 tarballs, no playground artifact.
- Focus-restoration tarball consumer smoke: pass for all 7 packages with approved registry access.
- Focus-restoration playground build: pass; existing Angular 1.38 MB minified chunk warning remains.
- Focus-order `bun run check` and `bun run typecheck`: pass (93 files; no diagnostics).
- Focus-order `bun test`: pass, 137 tests / 0 failures across 20 files.
- Focus-order build and pack: pass; exactly 7 distributions and 7 tarballs, no playground artifact.
- Focus-order tarball consumer smoke: pass for all 7 packages with approved registry access.
- Focus-order playground build: pass; existing Angular 1.38 MB minified chunk warning remains.
- Second-review `bun run check`: pass (93 files); `bun run typecheck`: pass.
- Second-review `bun test`: pass, 136 tests / 0 failures across 20 files.
- Second-review `bun run build` and `bun run pack`: pass; exactly 7 public distributions and 7 tarballs, with no playground artifact.
- Second-review `bun run test:tarballs`: sandboxed startup stalled; approved registry retry passed the external consumer contract for all 7 packages.
- Second-review playground build: pass; existing Angular 1.38 MB minified chunk warning remains.
- `bun run check`: pass (92 files).
- `bun run typecheck`: pass.
- focused DOM, pointer, focus-guard, and controller tests: 61 passed, 0 failed.
- `bun test`: pass, 131 tests / 0 failures across 20 files.
- `bun run build`: pass, exactly 7 publishable package distributions.
- `bun run pack`: pass, exactly 7 tarballs and no playground artifact.
- `bun run test:tarballs`: sandboxed attempt stalled after the external consumer started; approved registry retry passed all 7 package smoke checks.
- `bun run --cwd apps/playground build`: pass; the existing Angular 1.38 MB minified chunk warning remains.

## Remaining gates

- None for this review follow-up.

## Prior release-gate verification

- `bun test`: pass, 119 tests / 0 failures across 20 files (re-run after direct button permission wiring).
- `bun run build`: pass, exactly 7 public distributions.
- `bun run pack`: pass, exactly 7 library tarballs; playground absent.
- `bun run test:tarballs`: the sandboxed attempt produced no completion output within 30 seconds; approved registry access then passed the external consumer contract for all 7 packages.
- `bun run --cwd apps/playground build`: pass; it remains a separate private build gate. The existing Angular chunk warning remains (1.38 MB minified).
