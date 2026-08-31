import type {
  GlowTour as CoreGlowTour,
  StepPropsStore as CoreStepPropsStore,
  TourState as CoreTourState,
  WorkflowDefinition as CoreWorkflowDefinition,
} from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";
import type { JSX } from "solid-js";

export type SolidTourContent = JSX.Element;
export type Tour = CoreGlowTour<SolidTourContent>;
export type TourState = CoreTourState<SolidTourContent>;
export type StepPropsStore = CoreStepPropsStore<SolidTourContent>;
export type WorkflowDefinition = CoreWorkflowDefinition<SolidTourContent>;

export function createGlowTour(): Tour {
  return createCoreGlowTour<SolidTourContent>();
}
