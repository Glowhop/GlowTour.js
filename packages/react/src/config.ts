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
import type { ReactTourContent } from "./glow-tour";

export type {
  BuiltinAction,
  ConfigValidationIssue,
  CreateWorkflowFromConfigOptions,
  ValidateWorkflowConfigOptions,
};
export { ConfigValidationError };

/** React workflow config: `WorkflowConfig` pre-bound to `ReactTourContent`. */
export type WorkflowConfig = CoreWorkflowConfig<ReactTourContent>;
/** React step config: `StepConfig` pre-bound to `ReactTourContent`. */
export type StepConfig = CoreStepConfig<ReactTourContent>;
/** React event handler config: `EventHandlerConfig` pre-bound to `ReactTourContent`. */
export type EventHandlerConfig = CoreEventHandlerConfig<ReactTourContent>;
/** React step action reference: `StepActionRef` pre-bound to `ReactTourContent`. */
export type StepActionRef = CoreStepActionRef<ReactTourContent>;
/** React transition action reference: `TransitionActionRef` pre-bound to `ReactTourContent`. */
export type TransitionActionRef = CoreTransitionActionRef<ReactTourContent>;
/** React lifecycle action reference: `LifecycleActionRef` pre-bound to `ReactTourContent`. */
export type LifecycleActionRef = CoreLifecycleActionRef<ReactTourContent>;
/** React workflow definition produced from config, pre-bound to `ReactTourContent`. */
export type WorkflowDefinitionFromConfig = CoreWorkflowDefinitionFromConfig<ReactTourContent>;

/**
 * Builds a React `WorkflowDefinition` from a JSON-serializable config, pre-bound to
 * `ReactTourContent` so the result is accepted by `createGlowTour().run(...)` with no generic
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
  return createCoreWorkflowFromConfig<ReactTourContent>(config, options);
}

/**
 * Validates and narrows an unknown value to a React `WorkflowConfig`.
 * @param config The parsed JSON (or equivalent plain object) to validate.
 * @param options Validation options; see `ValidateWorkflowConfigOptions`.
 * @throws {ConfigValidationError} When one or more issues are found.
 * @returns The same value, narrowed to `WorkflowConfig`.
 */
export function validateWorkflowConfig(
  config: unknown,
  options: ValidateWorkflowConfigOptions = {},
): WorkflowConfig {
  return validateCoreWorkflowConfig<ReactTourContent>(config, options);
}
