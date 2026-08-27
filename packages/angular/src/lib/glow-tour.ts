import type { TemplateRef } from "@angular/core";
import type { GlowTour } from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";

export type AngularTourContent = string | TemplateRef<unknown>;

export function createGlowTour(): GlowTour<AngularTourContent> {
  return createCoreGlowTour<AngularTourContent>();
}
