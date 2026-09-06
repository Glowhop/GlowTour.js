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
import type { SolidTourContent } from "./glow-tour";

export type {
  BuiltinAction,
  ConfigValidationIssue,
  CreateWorkflowFromConfigOptions,
  ValidateWorkflowConfigOptions,
};
export { ConfigValidationError };

/** Solid workflow config: `WorkflowConfig` pre-bound to `SolidTourContent`. */
export type WorkflowConfig = CoreWorkflowConfig<SolidTourContent>;
/** Solid step config: `StepConfig` pre-bound to `SolidTourContent`. */
export type StepConfig = CoreStepConfig<SolidTourContent>;
/** Solid event handler config: `EventHandlerConfig` pre-bound to `SolidTourContent`. */
export type EventHandlerConfig = CoreEventHandlerConfig<SolidTourContent>;
/** Solid step action reference: `StepActionRef` pre-bound to `SolidTourContent`. */
export type StepActionRef = CoreStepActionRef<SolidTourContent>;
/** Solid transition action reference: `TransitionActionRef` pre-bound to `SolidTourContent`. */
export type TransitionActionRef = CoreTransitionActionRef<SolidTourContent>;
/** Solid lifecycle action reference: `LifecycleActionRef` pre-bound to `SolidTourContent`. */
export type LifecycleActionRef = CoreLifecycleActionRef<SolidTourContent>;
/** Solid workflow definition produced from config, pre-bound to `SolidTourContent`. */
export type WorkflowDefinitionFromConfig = CoreWorkflowDefinitionFromConfig<SolidTourContent>;

/**
 * Builds a Solid `WorkflowDefinition` from a JSON-serializable config, pre-bound to
 * `SolidTourContent` so the result is accepted by `createGlowTour().run(...)` with no generic
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
  return createCoreWorkflowFromConfig<SolidTourContent>(config, options);
}

/**
 * Validates and narrows an unknown value to a Solid `WorkflowConfig`.
 * @param config The parsed JSON (or equivalent plain object) to validate.
 * @param options Validation options; see `ValidateWorkflowConfigOptions`.
 * @throws {ConfigValidationError} When one or more issues are found.
 * @returns The same value, narrowed to `WorkflowConfig`.
 */
export function validateWorkflowConfig(
  config: unknown,
  options: ValidateWorkflowConfigOptions = {},
): WorkflowConfig {
  return validateCoreWorkflowConfig<SolidTourContent>(config, options);
}
