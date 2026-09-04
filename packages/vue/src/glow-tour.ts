import type {
  GlowTour as CoreGlowTour,
  StartOptions as CoreStartOptions,
  StepPropsStore as CoreStepPropsStore,
  TourState as CoreTourState,
  WorkflowDefinition as CoreWorkflowDefinition,
  GlowTourOptions,
} from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";
import type { VNodeChild } from "vue";

/** Vue content type: any valid Vue VNode child. */
export type VueTourContent = VNodeChild;
/** Vue tour controller instance. */
export type Tour = CoreGlowTour<VueTourContent>;
/** Vue tour state snapshot. */
export type TourState = CoreTourState<VueTourContent>;
/** Vue step properties store. */
export type StepPropsStore = CoreStepPropsStore<VueTourContent>;
/** Vue workflow definition. */
export type WorkflowDefinition = CoreWorkflowDefinition<VueTourContent>;
/** Vue tour start options. */
export type StartOptions = CoreStartOptions<VueTourContent>;

/**
 * Creates a new Glow Tour instance for Vue.
 * @param options Tour options for error handling.
 * @returns A tour controller ready to run Vue workflows.
 */
export function createGlowTour(options: GlowTourOptions = {}): Tour {
  return createCoreGlowTour<VueTourContent>(options);
}
