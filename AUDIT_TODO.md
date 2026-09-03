# Audit findings — action items by package

Source: full audit of `packages/core` and all framework adapters (2026-09-03).

## packages/core

- [x] Remove leftover debug log — [`src/dom/tour-view-driver.ts:503`](packages/core/src/dom/tour-view-driver.ts#L503)
  ```ts
  console.log("TourViewDriver: presentation changed, updated animation options and synced controls");
  ```
  Fires on every presentation change; pollutes consumer app consoles in normal usage.

- [x] Remove direct `console.warn` calls in `elements/popover.ts` and `elements/overlay.ts` — these guarded internal invariants that should never occur (the DOM nodes are created and owned by glow-tour itself) and weren't actionable by consumer apps, so they were dropped rather than routed through a new configurable channel (kept the existing silent early-return guards).

## packages/angular

- [x] ~~Normalize cleanup pattern in `GlowTourBoundElement.bind`~~ — investigated and skipped. `bind()` runs from `ngOnInit()`, outside the constructor's injection context, so `effect()` needs the explicit `injector` option there; the paired `destroyRef.onDestroy(() => cleanup.destroy())` is defensive but not a bug, and removing it risks a subtle lifecycle regression for no real benefit. Left as-is.

## packages/react, packages/vue, packages/solid, packages/vanilla

No action items — clean on this pass (no leaks, no `any`, no dead code, solid test coverage).

---

Not an issue, no action needed: `packages/core/dist/` is correctly gitignored; the "core has no presentation" framing in `CLAUDE.md` is accurate given `packages/styles` is only an optional quick-start theme, not the real presentation boundary — `packages/core/src/elements/` owning positioning/animation behavior is by design.
