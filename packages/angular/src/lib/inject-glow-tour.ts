import { computed, DestroyRef, inject, type Signal, signal } from "@angular/core";
import type { GlowTourOptions } from "@glowhop/core-tour";
import { createGlowTour, type Tour, type TourState } from "./glow-tour";

/** What `injectGlowTour` returns: the tour, its methods, and one signal per state field. */
export type InjectGlowTourResult = Pick<
  Tour,
  "advance" | "cancel" | "create" | "goTo" | "previous" | "run"
> & {
  /** The tour instance, to pass to `glow-tour-default` or `glow-tour-root`. */
  readonly tour: Tour;
} & { readonly [K in keyof TourState]: Signal<TourState[K]> };

/**
 * Runs a tour from a component, with its state as signals. Call it in an injection context.
 *
 * Called with options, it creates a tour and disposes it when the injector is destroyed.
 * Called with an existing tour, it only reads it and never disposes it.
 * @param source Options for a new tour, or an existing tour to share.
 * @returns The tour, its methods, and one signal per state field.
 */
export function injectGlowTour(source: GlowTourOptions | Tour = {}): InjectGlowTourResult {
  const shared = "run" in source;
  const tour = shared ? source : createGlowTour(source);
  const snapshot = signal(tour.state.get());
  const unsubscribe = tour.state.subscribe((state) => snapshot.set(state));
  inject(DestroyRef).onDestroy(() => {
    unsubscribe();
    if (!shared) tour.dispose();
  });
  const { advance, cancel, create, goTo, previous, run } = tour;
  const result: Record<string, unknown> = { advance, cancel, create, goTo, previous, run, tour };
  for (const key of Object.keys(snapshot()) as (keyof TourState)[]) {
    result[key] = computed(() => snapshot()[key]);
  }
  return result as InjectGlowTourResult;
}
