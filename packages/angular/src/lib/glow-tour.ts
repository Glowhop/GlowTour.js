import type { TemplateRef } from "@angular/core";
import type {
  GlowTour as CoreGlowTour,
  StartOptions as CoreStartOptions,
  StepPropsStore as CoreStepPropsStore,
  TourState as CoreTourState,
  WorkflowDefinition as CoreWorkflowDefinition,
  GlowTourOptions,
} from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";

/** Angular content type: string or TemplateRef. */
export type AngularTourContent = string | TemplateRef<unknown>;
/** Angular tour controller instance. */
export type Tour = CoreGlowTour<AngularTourContent>;
/** Angular tour state snapshot. */
export type TourState = CoreTourState<AngularTourContent>;
/** Angular step properties store. */
export type StepPropsStore = CoreStepPropsStore<AngularTourContent>;
/** Angular workflow definition. */
export type WorkflowDefinition = CoreWorkflowDefinition<AngularTourContent>;
/** Angular tour start options. */
export type StartOptions = CoreStartOptions<AngularTourContent>;

/**
 * Creates a new Glow Tour instance for Angular.
 * @param options Tour options for error handling.
 * @returns A tour controller ready to run Angular workflows.
 */
export function createGlowTour(options: GlowTourOptions = {}): Tour {
  return createCoreGlowTour<AngularTourContent>(options);
}
