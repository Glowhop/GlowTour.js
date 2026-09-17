import type { GlowTourOptions } from "@glowhop/core-tour";
import { type Accessor, onCleanup } from "solid-js";
import { useTourSnapshot } from "./components/tour-components";
import { createGlowTour, type Tour, type TourState } from "./glow-tour";

/** What `useGlowTour` returns: the tour, its methods, and one accessor per state field. */
export type UseGlowTourResult = Pick<
  Tour,
  "advance" | "cancel" | "create" | "goTo" | "previous" | "start"
> & {
  /** The tour instance, to pass to `GlowTourDefault` or `GlowTourRoot`. */
  readonly tour: Tour;
} & { readonly [K in keyof TourState]: Accessor<TourState[K]> };

/**
 * Runs a tour from a component, with its state as accessors.
 *
 * Called with options, it creates a tour and disposes it when the owning scope is cleaned up.
 * Called with an existing tour, it only reads it and never disposes it.
 * @param source Options for a new tour, or an existing tour to share.
 * @returns The tour, its methods, and one accessor per state field.
 */
export function useGlowTour(source: GlowTourOptions | Tour = {}): UseGlowTourResult {
  const shared = "start" in source;
  const tour = shared ? source : createGlowTour(source);
  if (!shared) onCleanup(tour.dispose);
  const snapshot = useTourSnapshot(() => tour);
  const { advance, cancel, create, goTo, previous, start } = tour;
  const result: Record<string, unknown> = { advance, cancel, create, goTo, previous, start, tour };
  for (const key of Object.keys(snapshot()) as (keyof TourState)[]) {
    result[key] = () => snapshot()[key];
  }
  return result as UseGlowTourResult;
}
