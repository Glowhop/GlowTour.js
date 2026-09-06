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
import type { VanillaTourContent } from "./glow-tour";

export type {
  BuiltinAction,
  ConfigValidationIssue,
  CreateWorkflowFromConfigOptions,
  ValidateWorkflowConfigOptions,
};
export { ConfigValidationError };

/** Vanilla workflow config: `WorkflowConfig` pre-bound to `VanillaTourContent`. */
export type WorkflowConfig = CoreWorkflowConfig<VanillaTourContent>;
/** Vanilla step config: `StepConfig` pre-bound to `VanillaTourContent`. */
export type StepConfig = CoreStepConfig<VanillaTourContent>;
/** Vanilla event handler config: `EventHandlerConfig` pre-bound to `VanillaTourContent`. */
export type EventHandlerConfig = CoreEventHandlerConfig<VanillaTourContent>;
/** Vanilla step action reference: `StepActionRef` pre-bound to `VanillaTourContent`. */
export type StepActionRef = CoreStepActionRef<VanillaTourContent>;
/** Vanilla transition action reference: `TransitionActionRef` pre-bound to `VanillaTourContent`. */
export type TransitionActionRef = CoreTransitionActionRef<VanillaTourContent>;
/** Vanilla lifecycle action reference: `LifecycleActionRef` pre-bound to `VanillaTourContent`. */
export type LifecycleActionRef = CoreLifecycleActionRef<VanillaTourContent>;
/** Vanilla workflow definition produced from config, pre-bound to `VanillaTourContent`. */
export type WorkflowDefinitionFromConfig = CoreWorkflowDefinitionFromConfig<VanillaTourContent>;

/**
 * Builds a vanilla `WorkflowDefinition` from a JSON-serializable config, pre-bound to
 * `VanillaTourContent` so the result is accepted by `createGlowTour().run(...)` with no generic
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
  return createCoreWorkflowFromConfig<VanillaTourContent>(config, options);
}

/**
 * Validates and narrows an unknown value to a vanilla `WorkflowConfig`.
 * @param config The parsed JSON (or equivalent plain object) to validate.
 * @param options Validation options; see `ValidateWorkflowConfigOptions`.
 * @throws {ConfigValidationError} When one or more issues are found.
 * @returns The same value, narrowed to `WorkflowConfig`.
 */
export function validateWorkflowConfig(
  config: unknown,
  options: ValidateWorkflowConfigOptions = {},
): WorkflowConfig {
  return validateCoreWorkflowConfig<VanillaTourContent>(config, options);
}
