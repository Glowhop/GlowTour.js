import type { AngularTourContent } from "@glowhop/angular-tour";
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

export type {
  BuiltinAction,
  ConfigValidationIssue,
  CreateWorkflowFromConfigOptions,
  ValidateWorkflowConfigOptions,
};
export { ConfigValidationError };

/** Angular workflow config: `WorkflowConfig` pre-bound to `AngularTourContent`. */
export type WorkflowConfig = CoreWorkflowConfig<AngularTourContent>;
/** Angular step config: `StepConfig` pre-bound to `AngularTourContent`. */
export type StepConfig = CoreStepConfig<AngularTourContent>;
/** Angular event handler config: `EventHandlerConfig` pre-bound to `AngularTourContent`. */
export type EventHandlerConfig = CoreEventHandlerConfig<AngularTourContent>;
/** Angular step action reference: `StepActionRef` pre-bound to `AngularTourContent`. */
export type StepActionRef = CoreStepActionRef<AngularTourContent>;
/** Angular transition action reference: `TransitionActionRef` pre-bound to `AngularTourContent`. */
export type TransitionActionRef = CoreTransitionActionRef<AngularTourContent>;
/** Angular lifecycle action reference: `LifecycleActionRef` pre-bound to `AngularTourContent`. */
export type LifecycleActionRef = CoreLifecycleActionRef<AngularTourContent>;
/** Angular workflow definition produced from config, pre-bound to `AngularTourContent`. */
export type WorkflowDefinitionFromConfig = CoreWorkflowDefinitionFromConfig<AngularTourContent>;

/**
 * Builds an Angular `WorkflowDefinition` from a JSON-serializable config, pre-bound to
 * `AngularTourContent` so the result is accepted by `createGlowTour().run(...)` with no generic
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
  return createCoreWorkflowFromConfig<AngularTourContent>(config, options);
}

/**
 * Validates and narrows an unknown value to an Angular `WorkflowConfig`.
 * @param config The parsed JSON (or equivalent plain object) to validate.
 * @param options Validation options; see `ValidateWorkflowConfigOptions`.
 * @throws {ConfigValidationError} When one or more issues are found.
 * @returns The same value, narrowed to `WorkflowConfig`.
 */
export function validateWorkflowConfig(
  config: unknown,
  options: ValidateWorkflowConfigOptions = {},
): WorkflowConfig {
  return validateCoreWorkflowConfig<AngularTourContent>(config, options);
}
