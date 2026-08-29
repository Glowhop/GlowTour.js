export type {
  DynamicStepProps,
  GlowTour as Tour,
  StartOptions,
  TourState,
  WorkflowDefinition,
} from "@glowhop/core-tour";
export {
  type CreateDefaultTourElementOptions,
  createDefaultTourElement,
} from "./components/default-tour";
export type { GlowTourRootElement } from "./components/web-components";
export { GLOW_TOUR_ELEMENT_NAMES } from "./components/web-components";
export type { VanillaGlowTour, VanillaTourContent } from "./glow-tour";
export { createGlowTour } from "./glow-tour";

import { registerGlowTourElements } from "./components/web-components";

registerGlowTourElements();
