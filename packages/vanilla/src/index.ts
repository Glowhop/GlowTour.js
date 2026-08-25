export type {
  DynamicStepProps,
  StartOptions,
  StepParameters,
  WorkflowDefinition,
  WorkflowState,
} from "@glowhop/core-tour";
export {
  Builder,
  create,
  createTourStore,
  StepBuilder,
  TourStore,
  WorkflowInstance,
  WorkflowStep,
} from "@glowhop/core-tour";
export { GLOW_TOUR_ELEMENT_NAMES, registerGlowTourElements } from "./components/web-components";
export type { VanillaTourContent } from "./glow-tour";
export { glowTour } from "./glow-tour";

import { registerGlowTourElements } from "./components/web-components";

registerGlowTourElements();
