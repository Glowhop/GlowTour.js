import type {
  GlowTour as CoreGlowTour,
  StartOptions as CoreStartOptions,
  StepPropsStore as CoreStepPropsStore,
  TourState as CoreTourState,
  WorkflowDefinition as CoreWorkflowDefinition,
  GlowTourOptions,
} from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";
import type { ReactNode } from "react";

export type ReactTourContent = ReactNode;
export type Tour = CoreGlowTour<ReactTourContent>;
export type TourState = CoreTourState<ReactTourContent>;
export type StepPropsStore = CoreStepPropsStore<ReactTourContent>;
export type WorkflowDefinition = CoreWorkflowDefinition<ReactTourContent>;
export type StartOptions = CoreStartOptions<ReactTourContent>;

export function createGlowTour(options: GlowTourOptions = {}): Tour {
  return createCoreGlowTour<ReactTourContent>(options);
}
