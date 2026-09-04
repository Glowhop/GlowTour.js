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

export type AngularTourContent = string | TemplateRef<unknown>;
export type Tour = CoreGlowTour<AngularTourContent>;
export type TourState = CoreTourState<AngularTourContent>;
export type StepPropsStore = CoreStepPropsStore<AngularTourContent>;
export type WorkflowDefinition = CoreWorkflowDefinition<AngularTourContent>;
export type StartOptions = CoreStartOptions<AngularTourContent>;

export function createGlowTour(options: GlowTourOptions = {}): Tour {
  return createCoreGlowTour<AngularTourContent>(options);
}
