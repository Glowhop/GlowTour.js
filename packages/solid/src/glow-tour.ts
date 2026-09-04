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

/** Solid content type: any valid Solid JSX element. */
export type SolidTourContent = JSX.Element;
/** Solid tour controller instance. */
export type Tour = CoreGlowTour<SolidTourContent>;
/** Solid tour state snapshot. */
export type TourState = CoreTourState<SolidTourContent>;
/** Solid step properties store. */
export type StepPropsStore = CoreStepPropsStore<SolidTourContent>;
/** Solid workflow definition. */
export type WorkflowDefinition = CoreWorkflowDefinition<SolidTourContent>;
/** Solid tour start options. */
export type StartOptions = CoreStartOptions<SolidTourContent>;

/**
 * Creates a new Glow Tour instance for Solid.
 * @param options Tour options for error handling.
 * @returns A tour controller ready to run Solid workflows.
 */
export function createGlowTour(options: GlowTourOptions = {}): Tour {
  return createCoreGlowTour<SolidTourContent>(options);
}
