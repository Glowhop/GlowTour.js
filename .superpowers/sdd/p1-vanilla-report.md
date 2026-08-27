# P1.3E Vanilla root property report

## Scope

- Replaced the Vanilla singleton with the specialized `createGlowTour()` factory.
- Made `<glow-tour-root>.tour` the only instance injection point and kept the Core bridge behind an adapter-local symbol guard.
- Migrated the Vanilla playground, packaged-tarball contract, browser runner, and release-contract ordering.

## Runtime contract

- Importing the package automatically registers custom elements only when DOM globals exist; Node/SSR imports remain safe and duplicate definitions are avoided.
- Each connected root owns one private bridge lease. Root `tour` and `idPrefix` changes are reconciled together in a microtask when replacing an active lease; disconnect and `tour = null` release it.
- Descendants resolve their nearest root, subscribe only to that tour's readonly state, and use cleanup-owned binding callbacks for popover, overlay, and pointer. Nested roots are excluded from parent cleanup and delegated controls.
- The Core-provided IDs are applied to the root-local header/content/popover/control links. Release removes generated child IDs and ARIA links before reuse of the same prefix.
- Back, Next, and Cancel expose only Core delegated markers. Consumer disabled state, `aria-disabled`, default-prevented clicks, and Core shortcut labels remain authoritative.

## TDD evidence

- RED: `bun test packages/vanilla/src/vanilla.test.ts` failed 2/2 because the legacy runtime had no `createGlowTour` export.
- RED: `bun test --conditions=browser ./packages/vanilla/src/vanilla.browser.ts` initially could not resolve Vanilla's missing `happy-dom` test dependency.
- GREEN: the focused contract test passed 2/2 and the real happy-dom suite passed 6/6 after the factory, scoped-root bindings, and test dependency were added.

## Verification

- `bun install --frozen-lockfile` — pass; 367 installs checked.
- `bun run check` and `bun run typecheck` — pass.
- `bun test` — pass; 163 tests across 21 files.
- `bun run test:browser` — pass; React 12/12, Solid 8/8, Vue 10/10, Angular 10/10, Vanilla 6/6.
- `bun run build` and `bun run pack` — pass; seven publishable distributions and seven tarballs.
- `bun run test:tarballs` — pass with registry access; all seven external consumer packages passed.
- `bun run --cwd apps/playground build`, `bun run release:prepare`, and `bun run release:publish -- --dry-run` — pass. The existing Angular chunk-size warning remains.

## Ownership review follow-up

- Pre-definition own `tour` and `idPrefix` properties are replayed through the upgraded root prototype. Root state lives in a `WeakMap`, so happy-dom's legacy upgrade callback shape and standard browser upgrades both use the same accessors safely.
- Every dynamic Vanilla-managed ID/ARIA/disabled attribute has a per-element exact snapshot. On release/rebind, authored values—including values equal to the generated defaults—are restored unchanged. Explicit child IDs are retained and generated default ARIA relationships point to those IDs.
- A scoped custom element restores subscriptions, bridge bindings, and owned attributes immediately on disconnect, then rebinds to its nearest root when remounted. Trigger label ownership is kept separately from generated labels; authored labels survive reconnect while an empty trigger updates to its last-step finish label.
- The Core root-prefix collision check permits a matching ID family only inside the root currently claiming that prefix. Prefix reservations and external-document collisions still reject, and authored duplicate IDs are not rewritten.
- Vanilla owns the rendered disabled state of controls marked `data-glow-tour-control-managed`; Core still delegates commands and honors `data-glow-tour-consumer-disabled`. Property and `setAttribute`/`removeAttribute` updates remain consumer-authoritative without Core transition writes being misclassified.

### Review verification

- RED: real happy-dom repros failed for own expandos (`this.reconcile is not a function`), descendant authored IDs (`idPrefix is already in use`), stale move-out IDs/ARIA, and consumer disabled sync.
- GREEN: Core targeted root/driver suites passed 56/56 and Vanilla happy-dom passed 11/11.
- Final source gates passed: frozen install (367), Biome (103 files), typecheck, full unit suite (165/165), browser suites React 12/12, Solid 8/8, Vue 10/10, Angular 10/10, Vanilla 11/11, build 7/7, pack 7/7, playground build, and both release dry-runs.
- Fresh external tarball smoke is not claimed: the local run exceeded the sandbox window and the required elevated npm-registry run was rejected by the environment usage limit. The prior unchanged P1.3E tarball smoke had passed.

## Final review follow-up

- Core now checks every exact `[id]` match for each scoped ID before accepting an explicit prefix. A match is valid only if every matching element belongs to the root being claimed; document order cannot hide an external collision.
- Managed attributes retain their last adapter-owned value. If a connected consumer changes an owned ID/ARIA attribute, management is relinquished before any later render or restore and that exact value or absence stays consumer-owned through remount.
- `aria-disabled` is consumer intent: authored initial true and connected true/false/removal updates drive native `disabled`, the consumer marker, and delegated-command eligibility consistently. Adapter writes are guarded from being reinterpreted as consumer writes.
- Disabled tracking snapshots the exact own `disabled`, `setAttribute`, and `removeAttribute` descriptors. Cleanup restores originals only when its wrapper remains installed, preserving a descriptor the consumer replaces while connected.
- RED/GREEN evidence: outside-root collision, connected header rewrite, initial authored `aria-disabled`, and own-descriptor loss all failed before their respective fixes. Focused Core passed 57/57 and Vanilla happy-dom passed 14/14 after fixes.
- Final offline gates passed: frozen install (367), check (103 files), typecheck, full unit 166/166, all browser suites React 12/12, Solid 8/8, Vue 10/10, Angular 10/10, Vanilla 14/14, build/pack 7/7, playground build, and both release dry-runs. The existing Angular chunk-size warning remains.
- No fresh external tarball smoke or Git commit is claimed: npm registry and linked-worktree Git escalation were rejected by the environment usage limit. The dirty worktree is ready for a later authorized commit.

## Final disabled-tracking follow-up

- A no-settle regression covers `aria-disabled` true→false and false→true with immediate trigger disconnect/reconnect. Consumer intent now synchronizes native disabled and its marker synchronously, and preserves the correct snapshot through restore rather than relying on observer delivery.
- Descriptor setup is per property: a non-configurable own delegating `setAttribute` no longer prevents disabled-property interception or MutationObserver fallback. If disabled interception itself cannot install, the first adapter render adopts current native disabled/ARIA/marker intent before it writes. Existing non-configurable descriptors remain untouched.
- RED/GREEN evidence: same-tick false remount previously restored disabled true; a non-configurable own `setAttribute` previously allowed run to erase a pre-run disabled property. Vanilla happy-dom is now 16/16; Core focused is 57/57.
- Final offline gates passed: frozen install (367), check/typecheck, full unit 166/166, browser React 12/12, Solid 8/8, Vue 10/10, Angular 10/10, Vanilla 16/16, build/pack 7/7, playground build, and both release dry-runs. No fresh tarball smoke or Git commit is claimed; environment usage limits still block those operations.

## Live delegated-click follow-up

- Core delegated click execution now denies a trigger when its live native `disabled`, `aria-disabled="true"`, or consumer marker says disabled. It checks before queueing and again in the deferred microtask; keyboard shortcut capability remains independent.
- A Vanilla non-configurable `setAttribute` case proves immediate ARIA-disabled click denial without a settle. Clearing ARIA and native disabled then permits the delegated click.
- RED/GREEN evidence: the Core live-disabled test initially advanced; Core focused is now 58/58 and Vanilla focused 16/16. Final offline gates passed with unit 167/167, browser React 12/12, Solid 8/8, Vue 10/10, Angular 10/10, Vanilla 16/16, build/pack 7/7, playground build, and release dry-runs. No fresh tarball smoke or commit is claimed due the environment usage limit.
