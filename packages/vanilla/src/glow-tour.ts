import type { GlowTour } from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";

export type VanillaTourContent = string | Node;
export type VanillaGlowTour = GlowTour<VanillaTourContent>;

export function createGlowTour(): VanillaGlowTour {
  return createCoreGlowTour<VanillaTourContent>();
}
