import type { GlowTourOptions } from "@glowhop/core-tour";
import { useState } from "react";
import { useTourSnapshot } from "./components/tour-components";
import { createGlowTour, type Tour, type TourState } from "./glow-tour";

/** What `useGlowTour` returns: the tour, its methods, and its current state fields. */
export type UseGlowTourResult = Pick<
  Tour,
  "advance" | "cancel" | "create" | "goTo" | "previous" | "run"
> &
  TourState & {
    /** The tour instance, to pass to `GlowTourDefault` or `GlowTourRoot`. */
    readonly tour: Tour;
  };

/**
 * Runs a tour from a component and re-renders when its state changes.
 *
 * Called with options, it creates a tour once, on the first render. That tour is released with
 * its root when the component unmounts: call `tour.dispose()` yourself to end it earlier.
 * Called with an existing tour, it only reads it.
 * @param source Options for a new tour, or an existing tour to share.
 * @returns The tour, its methods, and its current state fields.
 */
export function useGlowTour(source: GlowTourOptions | Tour = {}): UseGlowTourResult {
  const [owned] = useState(() => ("run" in source ? null : createGlowTour(source)));
  const tour = owned ?? (source as Tour);
  const { advance, cancel, create, goTo, previous, run } = tour;
  return { ...useTourSnapshot(tour), advance, cancel, create, goTo, previous, run, tour };
}
