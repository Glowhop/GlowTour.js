# Task 1 report — Vanilla pure/auto registration and disabled contract

## Implementation

- Made `@glowhop/vanilla-tour`'s main entry pure and exported `registerGlowTourElements()`.
- Added `@glowhop/vanilla-tour/auto`, which registers elements then re-exports the main API.
- Registered constructors once per `CustomElementRegistry`, with idempotent calls and explicit incompatible-constructor failures.
- Guarded `createDefaultTourElement()` before DOM markup creation when registration is absent.
- Added the `auto` build entry, declarations, package export, TypeScript path, and published-manifest path normalization.
- Set source side effects to `./dist/auto.js`, producing the required published `./auto.js`.
- Moved dynamic disabled ownership to trigger hosts, added reflected host `disabled`, migrated an initial inner-button disabled state once, and removed native button wrappers, disabled observers, restoration helpers, and consumer marker state.
- Updated browser, manifest/release, and tarball smoke contracts.

## TDD evidence

### RED

`bun test packages/vanilla/src/vanilla.test.ts scripts/package-manifests.test.ts scripts/release-contract.test.ts` initially produced six expected failures:

- missing public `registerGlowTourElements` export;
- explicit registration unavailable without DOM;
- main entry registered all ten elements as an import side effect;
- `createDefaultTourElement()` created markup instead of throwing the required message;
- Vanilla source side-effects contract remained `true`;
- manifest normalization left `./dist/auto.js` unchanged.

### GREEN

The focused suite subsequently passed with 21 tests and 172 expectations.

## Verification

- `bun test packages/vanilla/src/vanilla.test.ts scripts/package-manifests.test.ts scripts/release-contract.test.ts` — pass.
- `bun run test:browser` — pass (65 browser tests across adapters).
- `bun run typecheck` — pass.
- `bun run build` — pass.
- `bun run pack` — pass.
- `bun run test:tarballs` — pass: seven-package tarball smoke contract.
- `bun run check` — pass.
- `git diff --check` — pass.

## Changed files

- `packages/vanilla/src/index.ts`
- `packages/vanilla/src/auto.ts`
- `packages/vanilla/src/components/default-tour.ts`
- `packages/vanilla/src/components/web-components.ts`
- `packages/vanilla/src/vanilla.test.ts`
- `packages/vanilla/src/vanilla.browser.ts`
- `packages/vanilla/package.json`
- `scripts/build-packages.ts`
- `scripts/package-manifests.ts`
- `scripts/package-manifests.test.ts`
- `scripts/release-contract.test.ts`
- `scripts/test-tarballs.ts`
- `tsconfig.json`

## Self-review

- Confirmed all ten names are defined only through explicit registration and no constructor/method wrapping remains.
- Confirmed the main entry imports safely without DOM globals and registration is a no-op there.
- Confirmed package output contains `index.js`, `auto.js`, and both declaration files; packed manifest has `sideEffects: ["./auto.js"]`.
- Confirmed no theme or README files were changed.

## Concerns

None.
