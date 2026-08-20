import type { GlowTour } from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";
import type { ReactNode } from "react";

export type ReactTourContent = ReactNode;

export function createGlowTour(): GlowTour<ReactTourContent> {
  return createCoreGlowTour<ReactTourContent>();
}
