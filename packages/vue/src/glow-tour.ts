import type {
  GlowTour as CoreGlowTour,
  StepPropsStore as CoreStepPropsStore,
  TourState as CoreTourState,
  WorkflowDefinition as CoreWorkflowDefinition,
  GlowTourOptions,
} from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";
import type { VNodeChild } from "vue";

export type VueTourContent = VNodeChild;
export type Tour = CoreGlowTour<VueTourContent>;
export type TourState = CoreTourState<VueTourContent>;
export type StepPropsStore = CoreStepPropsStore<VueTourContent>;
export type WorkflowDefinition = CoreWorkflowDefinition<VueTourContent>;

export function createGlowTour(options: GlowTourOptions = {}): Tour {
  return createCoreGlowTour<VueTourContent>(options);
}
