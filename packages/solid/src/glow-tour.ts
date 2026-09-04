import type {
  GlowTour as CoreGlowTour,
  StartOptions as CoreStartOptions,
  StepPropsStore as CoreStepPropsStore,
  TourState as CoreTourState,
  WorkflowDefinition as CoreWorkflowDefinition,
  GlowTourOptions,
} from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";
import type { JSX } from "solid-js";

export type SolidTourContent = JSX.Element;
export type Tour = CoreGlowTour<SolidTourContent>;
export type TourState = CoreTourState<SolidTourContent>;
export type StepPropsStore = CoreStepPropsStore<SolidTourContent>;
export type WorkflowDefinition = CoreWorkflowDefinition<SolidTourContent>;
export type StartOptions = CoreStartOptions<SolidTourContent>;

export function createGlowTour(options: GlowTourOptions = {}): Tour {
  return createCoreGlowTour<SolidTourContent>(options);
}
