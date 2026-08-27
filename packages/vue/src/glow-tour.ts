import type { GlowTour } from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";
import type { VNodeChild } from "vue";

export type VueTourContent = VNodeChild;

export function createGlowTour(): GlowTour<VueTourContent> {
  return createCoreGlowTour<VueTourContent>();
}
