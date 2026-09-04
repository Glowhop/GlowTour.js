import type {
  GlowTour as CoreGlowTour,
  StartOptions as CoreStartOptions,
  StepPropsStore as CoreStepPropsStore,
  TourState as CoreTourState,
  WorkflowDefinition as CoreWorkflowDefinition,
  GlowTourOptions,
} from "@glowhop/core-tour";
import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";

/** Vanilla content type: string or DOM Node. */
export type VanillaTourContent = string | Node;
/** Vanilla tour controller instance. */
export type Tour = CoreGlowTour<VanillaTourContent>;
/** Vanilla tour controller (alias for Tour). */
export type VanillaGlowTour = Tour;
/** Vanilla tour state snapshot. */
export type TourState = CoreTourState<VanillaTourContent>;
/** Vanilla step properties store. */
export type StepPropsStore = CoreStepPropsStore<VanillaTourContent>;
/** Vanilla workflow definition. */
export type WorkflowDefinition = CoreWorkflowDefinition<VanillaTourContent>;
/** Vanilla tour start options. */
export type StartOptions = CoreStartOptions<VanillaTourContent>;

/**
 * Creates a new Glow Tour instance for vanilla JavaScript.
 * @param options Tour options for error handling.
 * @returns A tour controller ready to run vanilla workflows.
 */
export function createGlowTour(options: GlowTourOptions = {}): Tour {
  return createCoreGlowTour<VanillaTourContent>(options);
}
