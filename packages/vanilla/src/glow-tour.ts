import type {
  DynamicStepProps as CoreDynamicStepProps,
  GlowTour as CoreGlowTour,
  TourState as CoreTourState,
  WorkflowDefinition as CoreWorkflowDefinition,
} from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";

export type VanillaTourContent = string | Node;
export type Tour = CoreGlowTour<VanillaTourContent>;
export type VanillaGlowTour = Tour;
export type TourState = CoreTourState<VanillaTourContent>;
export type DynamicStepProps = CoreDynamicStepProps<VanillaTourContent>;
export type WorkflowDefinition = CoreWorkflowDefinition<VanillaTourContent>;

export function createGlowTour(): Tour {
  return createCoreGlowTour<VanillaTourContent>();
}
