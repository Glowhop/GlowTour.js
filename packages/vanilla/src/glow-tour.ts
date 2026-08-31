import type {
  GlowTour as CoreGlowTour,
  StepPropsStore as CoreStepPropsStore,
  TourState as CoreTourState,
  WorkflowDefinition as CoreWorkflowDefinition,
  GlowTourOptions,
} from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";

export type VanillaTourContent = string | Node;
export type Tour = CoreGlowTour<VanillaTourContent>;
export type VanillaGlowTour = Tour;
export type TourState = CoreTourState<VanillaTourContent>;
export type StepPropsStore = CoreStepPropsStore<VanillaTourContent>;
export type WorkflowDefinition = CoreWorkflowDefinition<VanillaTourContent>;

export function createGlowTour(options: GlowTourOptions = {}): Tour {
  return createCoreGlowTour<VanillaTourContent>(options);
}
