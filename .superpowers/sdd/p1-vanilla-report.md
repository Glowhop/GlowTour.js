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
