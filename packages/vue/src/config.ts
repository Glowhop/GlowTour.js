import type {
  BuiltinAction,
  ConfigValidationIssue,
  EventHandlerConfig as CoreEventHandlerConfig,
  LifecycleActionRef as CoreLifecycleActionRef,
  StepActionRef as CoreStepActionRef,
  StepConfig as CoreStepConfig,
  TransitionActionRef as CoreTransitionActionRef,
  WorkflowConfig as CoreWorkflowConfig,
  WorkflowDefinitionFromConfig as CoreWorkflowDefinitionFromConfig,
  CreateWorkflowFromConfigOptions,
  ValidateWorkflowConfigOptions,
} from "@glowhop/core-tour/config";
import {
  ConfigValidationError,
  createWorkflowFromConfig as createCoreWorkflowFromConfig,
  validateWorkflowConfig as validateCoreWorkflowConfig,
} from "@glowhop/core-tour/config";
import type { VueTourContent } from "./glow-tour.js";

export type {
  BuiltinAction,
  ConfigValidationIssue,
  CreateWorkflowFromConfigOptions,
  ValidateWorkflowConfigOptions,
};
export { ConfigValidationError };

/** Vue workflow config: `WorkflowConfig` pre-bound to `VueTourContent`. */
export type WorkflowConfig = CoreWorkflowConfig<VueTourContent>;
/** Vue step config: `StepConfig` pre-bound to `VueTourContent`. */
export type StepConfig = CoreStepConfig<VueTourContent>;
/** Vue event handler config: `EventHandlerConfig` pre-bound to `VueTourContent`. */
export type EventHandlerConfig = CoreEventHandlerConfig<VueTourContent>;
/** Vue step action reference: `StepActionRef` pre-bound to `VueTourContent`. */
export type StepActionRef = CoreStepActionRef<VueTourContent>;
/** Vue transition action reference: `TransitionActionRef` pre-bound to `VueTourContent`. */
export type TransitionActionRef = CoreTransitionActionRef<VueTourContent>;
/** Vue lifecycle action reference: `LifecycleActionRef` pre-bound to `VueTourContent`. */
export type LifecycleActionRef = CoreLifecycleActionRef<VueTourContent>;
/** Vue workflow definition produced from config, pre-bound to `VueTourContent`. */
export type WorkflowDefinitionFromConfig = CoreWorkflowDefinitionFromConfig<VueTourContent>;

/**
 * Builds a Vue `WorkflowDefinition` from a JSON-serializable config, pre-bound to
 * `VueTourContent` so the result is accepted by `createGlowTour().run(...)` with no generic
 * and no cast.
 * @param config The parsed JSON (or equivalent plain object) to build from.
 * @param options Options; see `CreateWorkflowFromConfigOptions`.
 * @throws {ConfigValidationError} When the config is invalid.
 * @returns A frozen `WorkflowDefinition` with `.source` attached.
 */
export function createWorkflowFromConfig(
  config: unknown,
  options: CreateWorkflowFromConfigOptions = {},
): WorkflowDefinitionFromConfig {
  return createCoreWorkflowFromConfig<VueTourContent>(config, options);
}

/**
 * Validates and narrows an unknown value to a Vue `WorkflowConfig`.
 * @param config The parsed JSON (or equivalent plain object) to validate.
 * @param options Validation options; see `ValidateWorkflowConfigOptions`.
 * @throws {ConfigValidationError} When one or more issues are found.
 * @returns The same value, narrowed to `WorkflowConfig`.
 */
export function validateWorkflowConfig(
  config: unknown,
  options: ValidateWorkflowConfigOptions = {},
): WorkflowConfig {
  return validateCoreWorkflowConfig<VueTourContent>(config, options);
}
