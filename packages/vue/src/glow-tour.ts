import type {
  DynamicStepProps as CoreDynamicStepProps,
  GlowTour as CoreGlowTour,
  TourState as CoreTourState,
  WorkflowDefinition as CoreWorkflowDefinition,
} from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";
import type { VNodeChild } from "vue";

export type VueTourContent = VNodeChild;
export type Tour = CoreGlowTour<VueTourContent>;
export type TourState = CoreTourState<VueTourContent>;
export type DynamicStepProps = CoreDynamicStepProps<VueTourContent>;
export type WorkflowDefinition = CoreWorkflowDefinition<VueTourContent>;

export function createGlowTour(): Tour {
  return createCoreGlowTour<VueTourContent>();
}
