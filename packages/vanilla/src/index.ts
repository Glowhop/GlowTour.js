export type { StartOptions } from "@glowhop/core-tour";
export {
  type CreateDefaultTourElementOptions,
  createDefaultTourElement,
} from "./components/default-tour";
export type { GlowTourRootElement } from "./components/web-components";
export { GLOW_TOUR_ELEMENT_NAMES } from "./components/web-components";
export type {
  DynamicStepProps,
  Tour,
  TourState,
  VanillaGlowTour,
  VanillaTourContent,
  WorkflowDefinition,
} from "./glow-tour";
export { createGlowTour } from "./glow-tour";

import { registerGlowTourElements } from "./components/web-components";

registerGlowTourElements();
