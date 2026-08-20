import type { GlowTour } from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";
import type { JSX } from "solid-js";

export type SolidTourContent = JSX.Element;

export function createGlowTour(): GlowTour<SolidTourContent> {
  return createCoreGlowTour<SolidTourContent>();
}
