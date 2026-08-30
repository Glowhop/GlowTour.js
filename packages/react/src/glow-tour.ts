import type {
  GlowTour as CoreGlowTour,
  StepPropsStore as CoreStepPropsStore,
  TourState as CoreTourState,
  WorkflowDefinition as CoreWorkflowDefinition,
} from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";
import type { ReactNode } from "react";

export type ReactTourContent = ReactNode;
export type Tour = CoreGlowTour<ReactTourContent>;
export type TourState = CoreTourState<ReactTourContent>;
export type StepPropsStore = CoreStepPropsStore<ReactTourContent>;
export type WorkflowDefinition = CoreWorkflowDefinition<ReactTourContent>;

export function createGlowTour(): Tour {
  return createCoreGlowTour<ReactTourContent>();
}
