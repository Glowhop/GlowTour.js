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

/** React content type: any valid React node. */
export type ReactTourContent = ReactNode;
/** React tour controller instance. */
export type Tour = CoreGlowTour<ReactTourContent>;
/** React tour state snapshot. */
export type TourState = CoreTourState<ReactTourContent>;
/** React step properties store. */
export type StepPropsStore = CoreStepPropsStore<ReactTourContent>;
/** React workflow definition. */
export type WorkflowDefinition = CoreWorkflowDefinition<ReactTourContent>;
/** React tour start options. */
export type StartOptions = CoreStartOptions<ReactTourContent>;

/**
 * Creates a new Glow Tour instance for React.
 * @param options Tour options for error handling.
 * @returns A tour controller ready to run React workflows.
 */
export function createGlowTour(options: GlowTourOptions = {}): Tour {
  return createCoreGlowTour<ReactTourContent>(options);
}
