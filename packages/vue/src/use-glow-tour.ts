import type { GlowTourOptions } from "@glowhop/core-tour";
import { onScopeDispose, type Ref, toRef } from "vue";
import { useTourSnapshot } from "./components/tour-components.js";
import { createGlowTour, type Tour, type TourState } from "./glow-tour.js";

/** What `useGlowTour` returns: the tour, its methods, and one readonly ref per state field. */
export type UseGlowTourResult = Pick<
  Tour,
  "advance" | "cancel" | "create" | "goTo" | "previous" | "run"
> & {
  /** The tour instance, to pass to `GlowTourDefault` or `GlowTourRoot`. */
  readonly tour: Tour;
} & { readonly [K in keyof TourState]: Readonly<Ref<TourState[K]>> };

/**
 * Runs a tour from a component, with its state as refs.
 *
 * Called with options, it creates a tour and disposes it when the calling scope is disposed.
 * Called with an existing tour, it only reads it and never disposes it.
 * @param source Options for a new tour, or an existing tour to share.
 * @returns The tour, its methods, and one readonly ref per state field.
 */
export function useGlowTour(source: GlowTourOptions | Tour = {}): UseGlowTourResult {
  const shared = "run" in source;
  const tour = shared ? source : createGlowTour(source);
  if (!shared) onScopeDispose(tour.dispose);
  const snapshot = useTourSnapshot(() => tour);
  const { advance, cancel, create, goTo, previous, run } = tour;
  const result: Record<string, unknown> = { advance, cancel, create, goTo, previous, run, tour };
  for (const key of Object.keys(snapshot.value) as (keyof TourState)[]) {
    result[key] = toRef(() => snapshot.value[key]);
  }
  return result as UseGlowTourResult;
}
