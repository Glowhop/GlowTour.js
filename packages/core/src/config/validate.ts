import type { ConfigValidationIssue, WorkflowConfig } from "./types";
import { ConfigValidationError } from "./types";

const TOP_LEVEL_KEYS = [
  "version",
  "name",
  "cancellable",
  "allowScroll",
  "overlay",
  "popover",
  "indicator",
  "animated",
  "behavior",
  "onStart",
  "onCancel",
  "onFinish",
  "steps",
] as const;

const STEP_KEYS = [
  "id",
  "target",
  "overlay",
  "popover",
  "indicator",
  "behavior",
  "title",
  "content",
  "data",
  "actions",
  "targetEvents",
  "beforeEnter",
  "beforeLeave",
] as const;

const EVENT_HANDLER_KEYS = ["event", "action"] as const;

const ANIMATION_KEYS = ["duration", "easing"] as const;
const OVERLAY_KEYS = ["animated", "animation", "color", "opacity", "padding", "radius"] as const;
const INDICATOR_KEYS = ["animated", "animation", "hidden", "gap", "placementTryOrder"] as const;
const POPOVER_KEYS = [
  "animated",
  "animation",
  "placementTryOrder",
  "arrow",
  "controls",
  "gap",
] as const;
const CONTROL_KEYS = ["advance", "previous", "cancel"] as const;
const POPOVER_ARROW_KEYS = [
  "hidden",
  "color",
  "size",
  "borderWidth",
  "borderRadius",
  "edgePadding",
  "styleNonce",
  "autoStyles",
] as const;
const KEYBOARD_SHORTCUT_KEYS = ["previous", "advance", "cancel"] as const;
const MISSING_TARGET_KEYS = ["strategy", "timeout"] as const;
const BEHAVIOR_KEYS = [
  "allowInteraction",
  "autoFocus",
  "autoScroll",
  "keyboard",
  "missingTarget",
  "scroll",
  "overlayClick",
] as const;
const SCROLL_KEYS = ["behavior", "block", "inline"] as const;

/** The config format version this release reads. */
const CONFIG_VERSION = "1.1";

const BUILTIN_ACTION_KEYS: Record<string, readonly string[]> = {
  wait: ["type", "ms"],
  waitUntilElement: ["type", "selector", "interval", "timeout"],
  clickTarget: ["type"],
  focusTarget: ["type"],
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates a `title`/`content` value at `path`. Returns an error message, or `null` when the
 * value is acceptable.
 * @param value The candidate value.
 * @param path Error path for this field, e.g. `steps[2].title`.
 * @param validateContent Custom content validator; when omitted, the value must be a `string`.
 */
type ContentValidator = (value: unknown, path: string) => string | null;

function defaultContentValidator(value: unknown): string | null {
  return typeof value === "string" ? null : "must be a string";
}

/** Options accepted by `validateWorkflowConfig` (and threaded through internally). */
export interface ValidateWorkflowConfigOptions {
  /**
   * Validates `title`/`content` values. Returns an error message, or `null` when the value is
   * acceptable. Omit this to keep the default strict behavior — `title`/`content` must be plain
   * strings — which is required for the untrusted-JSON path (`JSON.parse()` output). Callers using
   * a rich content type `T` (e.g. `ReactNode`) must supply this to accept non-string values.
   */
  readonly validateContent?: ContentValidator;
}

/**
 * Validates and narrows an unknown value to a `WorkflowConfig<T>`.
 *
 * Performs a single pass over the whole config, collecting every issue (unknown/extra keys, wrong
 * types, missing required fields, invalid nested options, builtins used in slots that cannot run
 * them, etc.) rather than throwing on the first one — see `ConfigValidationError`.
 *
 * By default, `title`/`content` must be plain strings — the runtime cannot otherwise know what
 * `T` is, and this default keeps the untrusted-JSON path strict. Pass `options.validateContent`
 * to accept a richer `T` (e.g. `ReactNode`).
 *
 * @param config The parsed JSON (or equivalent plain object) to validate.
 * @param options Validation options; see {@link ValidateWorkflowConfigOptions}.
 * @throws {ConfigValidationError} When one or more issues are found.
 * @returns The same value, narrowed to `WorkflowConfig<T>`.
 */
export function validateWorkflowConfig<T = string>(
  config: unknown,
  options: ValidateWorkflowConfigOptions = {},
): WorkflowConfig<T> {
  const validateContent = options.validateContent ?? defaultContentValidator;
  const issues: ConfigValidationIssue[] = [];
  validateWorkflowConfigShape(config, issues, validateContent);
  if (issues.length > 0) throw new ConfigValidationError(issues);
  return config as WorkflowConfig<T>;
}

/**
 * Validates the top-level shape of a `WorkflowConfig`: required fields, no unknown/extra keys,
 * and recurses into `steps`.
 * @param value The candidate value.
 * @param issues Collector for every issue found; never throws itself.
 * @param validateContent Validator applied to each step's `title`/`content`.
 */
function validateWorkflowConfigShape(
  value: unknown,
  issues: ConfigValidationIssue[],
  validateContent: ContentValidator,
): void {
  if (!isPlainObject(value)) {
    issues.push({ path: "", message: "Workflow config must be a plain object" });
    return;
  }

  assertNoUnknownKeys(value, TOP_LEVEL_KEYS, "", issues);

  if (value.version !== CONFIG_VERSION) {
    issues.push({ path: "version", message: `version must be "${CONFIG_VERSION}"` });
  }

  if (typeof value.name !== "string" || value.name.length === 0) {
    issues.push({ path: "name", message: "name must be a non-empty string" });
  }
  validateOptionalBoolean("cancellable", value.cancellable, issues);
  validateOptionalBoolean("allowScroll", value.allowScroll, issues);
  validateOptionalBoolean("animated", value.animated, issues);
  validateOverlayShape("overlay", value.overlay, issues);
  validatePopoverShape("popover", value.popover, issues);
  validateIndicatorShape("indicator", value.indicator, issues);
  validateBehaviorShape("behavior", value.behavior, issues);
  validateLifecycleActionRefShape("onStart", value.onStart, issues);
  validateLifecycleActionRefShape("onCancel", value.onCancel, issues);
  validateLifecycleActionRefShape("onFinish", value.onFinish, issues);

  if (!Array.isArray(value.steps)) {
    issues.push({ path: "steps", message: "steps must be an array" });
    return;
  }
  const seenIds = new Map<string, number>();
  for (const [index, step] of value.steps.entries()) {
    validateStepConfigShape(step, `steps[${index}]`, issues, validateContent);
    if (isPlainObject(step) && typeof step.id === "string" && step.id.length > 0) {
      const duplicate = seenIds.get(step.id);
      if (duplicate === undefined) seenIds.set(step.id, index);
      else {
        issues.push({
          path: `steps[${index}].id`,
          message: `id "${step.id}" is already used by steps[${duplicate}]. Step ids must be unique.`,
        });
      }
    }
  }
}

/**
 * Validates a single `StepConfig`: required `target`/`content`, optional `title`, no unknown keys,
 * and recurses into `actions`, `targetEvents`, and the transition action refs.
 * @param value The candidate step value.
 * @param path Error path prefix for this step, e.g. `steps[2]`.
 * @param issues Collector for every issue found.
 */
function validateStepConfigShape(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
  validateContent: ContentValidator,
): void {
  if (!isPlainObject(value)) {
    issues.push({ path, message: "Step must be a plain object" });
    return;
  }

  assertNoUnknownKeys(value, STEP_KEYS, path, issues);

  if (typeof value.id !== "string" || value.id.length === 0) {
    issues.push({
      path: `${path}.id`,
      message: "id must be a non-empty string, unique within the workflow",
    });
  }
  if (typeof value.target !== "string" || value.target.length === 0) {
    issues.push({
      path: `${path}.target`,
      message: "target must be a non-empty CSS selector string",
    });
  }
  const titleError =
    value.title === undefined ? null : validateContent(value.title, `${path}.title`);
  if (titleError) issues.push({ path: `${path}.title`, message: titleError });
  const contentError = validateContent(value.content, `${path}.content`);
  if (contentError) issues.push({ path: `${path}.content`, message: contentError });
  validateOverlayShape(`${path}.overlay`, value.overlay, issues);
  validatePopoverShape(`${path}.popover`, value.popover, issues);
  validateIndicatorShape(`${path}.indicator`, value.indicator, issues);
  validateBehaviorShape(`${path}.behavior`, value.behavior, issues);
  validateDataShape(`${path}.data`, value.data, issues);

  if (value.actions !== undefined) {
    if (!Array.isArray(value.actions)) {
      issues.push({ path: `${path}.actions`, message: "actions must be an array" });
    } else {
      for (const [index, action] of value.actions.entries()) {
        validateStepActionRefShape(action, `${path}.actions[${index}]`, issues);
      }
    }
  }

  if (value.targetEvents !== undefined) {
    if (!Array.isArray(value.targetEvents)) {
      issues.push({ path: `${path}.targetEvents`, message: "targetEvents must be an array" });
    } else {
      for (const [index, handler] of value.targetEvents.entries()) {
        validateTargetEventConfigShape(handler, `${path}.targetEvents[${index}]`, issues);
      }
    }
  }

  validateHookActionRefShape(`${path}.beforeEnter`, value.beforeEnter, issues);
  validateHookActionRefShape(`${path}.beforeLeave`, value.beforeLeave, issues);
}

/**
 * Validates a single `TargetEventConfig`: `event` (string or non-empty string array), no
 * unknown/extra keys, and its `action`.
 * @param value The candidate event handler value.
 * @param path Error path prefix, e.g. `steps[2].targetEvents[0]`.
 * @param issues Collector for every issue found.
 */
function validateTargetEventConfigShape(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  if (!isPlainObject(value)) {
    issues.push({ path, message: "Target event must be a plain object" });
    return;
  }

  assertNoUnknownKeys(value, EVENT_HANDLER_KEYS, path, issues);

  const event = value.event;
  const eventIsValid =
    (typeof event === "string" && event.length > 0) ||
    (Array.isArray(event) &&
      event.length > 0 &&
      event.every((entry) => typeof entry === "string" && entry.length > 0));
  if (!eventIsValid) {
    issues.push({
      path: `${path}.event`,
      message: "event must be a non-empty string or a non-empty array of non-empty strings",
    });
  }

  validateStepActionRefShape(value.action, `${path}.action`, issues);
}

/**
 * Validates a `StepActionRef` (`actions[]` / `targetEvents[].action`): a function is always
 * accepted as-is, and a plain object with a `type` field is validated as a `BuiltinAction`.
 * Anything else — including a string, since there is no registry — is a validation error.
 * @param value The candidate action ref value.
 * @param path Error path for this ref, e.g. `steps[2].actions[0]`.
 * @param issues Collector for every issue found.
 */
function validateStepActionRefShape(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  if (typeof value === "function") return;
  if (isPlainObject(value) && typeof value.type === "string") {
    validateBuiltinActionShape(value, path, issues);
    return;
  }
  issues.push({
    path,
    message: 'must be a function, or a built-in action object with a known "type"',
  });
}

/**
 * Validates a `StepHookActionRef` (`beforeEnter`/`beforeLeave`) or a `LifecycleActionRef`
 * (`onStart`/`onCancel`/`onFinish`): only a function is valid. Built-in actions describe a step's
 * own action sequence, not hooks, and there is no registry, so any non-function value (including a
 * builtin action object) is rejected.
 * @param path Error path for this ref, e.g. `steps[2].beforeLeave`.
 * @param value The candidate ref value, or `undefined` if not set.
 * @param issues Collector for every issue found.
 */
function validateHookActionRefShape(
  path: string,
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (typeof value === "function") return;
  issues.push({
    path,
    message: "must be a function; built-in actions are not supported in this slot",
  });
}

/** See {@link validateHookActionRefShape}: lifecycle hooks share the same restriction. */
function validateLifecycleActionRefShape(
  path: string,
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  validateHookActionRefShape(path, value, issues);
}

/**
 * Validates a `BuiltinAction` object: known `type` discriminant, required fields for that variant,
 * correct field types, and no unknown/extra keys for that variant.
 * @param value The candidate builtin action value (already known to be a plain object with a `type` field).
 * @param path Error path for this action, e.g. `steps[2].actions[0]`.
 * @param issues Collector for every issue found.
 */
function validateBuiltinActionShape(
  value: Record<string, unknown>,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  const type = value.type as string;
  const allowedKeys = BUILTIN_ACTION_KEYS[type];
  if (!allowedKeys) {
    issues.push({ path: `${path}.type`, message: `Unknown built-in action type: ${type}` });
    return;
  }
  assertNoUnknownKeys(value, allowedKeys, path, issues);

  switch (type) {
    case "wait":
      validateFiniteNonNegative(`${path}.ms`, value.ms, issues);
      break;
    case "waitUntilElement":
      if (typeof value.selector !== "string" || value.selector.length === 0) {
        issues.push({ path: `${path}.selector`, message: "selector must be a non-empty string" });
      }
      validateOptionalFiniteNonNegative(`${path}.interval`, value.interval, issues);
      validateOptionalFiniteNonNegative(`${path}.timeout`, value.timeout, issues);
      break;
    case "clickTarget":
    case "focusTarget":
      break;
  }
}

function validateFiniteNonNegative(
  path: string,
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    issues.push({ path, message: "must be a finite non-negative number" });
  }
}

function validateOptionalFiniteNonNegative(
  path: string,
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  validateFiniteNonNegative(path, value, issues);
}

function validateOptionalBoolean(
  path: string,
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value !== undefined && typeof value !== "boolean") {
    issues.push({ path, message: "must be a boolean" });
  }
}

function validateOptionalString(
  path: string,
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value !== undefined && typeof value !== "string") {
    issues.push({ path, message: "must be a string" });
  }
}

function validateOptionalEnum(
  path: string,
  value: unknown,
  allowed: readonly string[],
  issues: ConfigValidationIssue[],
): void {
  if (value !== undefined && (typeof value !== "string" || !allowed.includes(value))) {
    issues.push({ path, message: `must be one of: ${allowed.join(", ")}` });
  }
}

function validateOptionalStringArray(
  path: string,
  value: unknown,
  issues: ConfigValidationIssue[],
  allowed?: readonly string[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ path, message: "must be an array" });
    return;
  }
  for (const [index, entry] of value.entries()) {
    if (typeof entry !== "string" || (allowed !== undefined && !allowed.includes(entry))) {
      issues.push({
        path: `${path}[${index}]`,
        message: allowed ? `must be one of: ${allowed.join(", ")}` : "must be a string",
      });
    }
  }
}

function validateAnimationShape(
  path: string,
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: "must be an object" });
    return;
  }
  assertNoUnknownKeys(value, ANIMATION_KEYS, path, issues);
  validateFiniteNonNegative(`${path}.duration`, value.duration, issues);
  if (typeof value.easing !== "string") {
    issues.push({ path: `${path}.easing`, message: "must be a string" });
  }
}

function validateBaseOptionsShape(
  path: string,
  value: Record<string, unknown>,
  issues: ConfigValidationIssue[],
): void {
  validateOptionalBoolean(`${path}.animated`, value.animated, issues);
  validateAnimationShape(`${path}.animation`, value.animation, issues);
}

function validateOverlayShape(path: string, value: unknown, issues: ConfigValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: "must be an object" });
    return;
  }
  assertNoUnknownKeys(value, OVERLAY_KEYS, path, issues);
  validateBaseOptionsShape(path, value, issues);
  validateOptionalString(`${path}.color`, value.color, issues);
  if (
    value.opacity !== undefined &&
    (typeof value.opacity !== "number" ||
      !Number.isFinite(value.opacity) ||
      value.opacity < 0 ||
      value.opacity > 1)
  ) {
    issues.push({ path: `${path}.opacity`, message: "must be a finite number between 0 and 1" });
  }
  validateOptionalFiniteNonNegative(`${path}.padding`, value.padding, issues);
  validateOptionalFiniteNonNegative(`${path}.radius`, value.radius, issues);
}

function validateIndicatorShape(
  path: string,
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: "must be an object" });
    return;
  }
  assertNoUnknownKeys(value, INDICATOR_KEYS, path, issues);
  validateBaseOptionsShape(path, value, issues);
  validateOptionalBoolean(`${path}.hidden`, value.hidden, issues);
  validateOptionalFiniteNonNegative(`${path}.gap`, value.gap, issues);
  validateOptionalStringArray(`${path}.placementTryOrder`, value.placementTryOrder, issues, [
    "top",
    "bottom",
    "left",
    "right",
  ]);
}

function validatePopoverArrowShape(
  path: string,
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: "must be an object" });
    return;
  }
  assertNoUnknownKeys(value, POPOVER_ARROW_KEYS, path, issues);
  validateOptionalBoolean(`${path}.hidden`, value.hidden, issues);
  validateOptionalString(`${path}.color`, value.color, issues);
  validateOptionalFiniteNonNegative(`${path}.size`, value.size, issues);
  validateOptionalFiniteNonNegative(`${path}.borderWidth`, value.borderWidth, issues);
  validateOptionalFiniteNonNegative(`${path}.borderRadius`, value.borderRadius, issues);
  validateOptionalFiniteNonNegative(`${path}.edgePadding`, value.edgePadding, issues);
  validateOptionalString(`${path}.styleNonce`, value.styleNonce, issues);
  validateOptionalBoolean(`${path}.autoStyles`, value.autoStyles, issues);
}

function validateKeyboardShortcutsShape(
  path: string,
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: "must be an object" });
    return;
  }
  assertNoUnknownKeys(value, KEYBOARD_SHORTCUT_KEYS, path, issues);
  for (const key of KEYBOARD_SHORTCUT_KEYS) {
    validateOptionalStringArray(`${path}.${key}`, value[key], issues);
  }
}

function validatePopoverShape(path: string, value: unknown, issues: ConfigValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: "must be an object" });
    return;
  }
  assertNoUnknownKeys(value, POPOVER_KEYS, path, issues);
  validateBaseOptionsShape(path, value, issues);
  validateOptionalStringArray(`${path}.placementTryOrder`, value.placementTryOrder, issues, [
    "top",
    "bottom",
    "left",
    "right",
  ]);
  validatePopoverArrowShape(`${path}.arrow`, value.arrow, issues);
  validateControlsShape(`${path}.controls`, value.controls, issues);
  validateOptionalFiniteNonNegative(`${path}.gap`, value.gap, issues);
}

function validateControlsShape(
  path: string,
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: "must be an object" });
    return;
  }
  assertNoUnknownKeys(value, CONTROL_KEYS, path, issues);
  for (const key of CONTROL_KEYS) {
    validateOptionalEnum(`${path}.${key}`, value[key], ["visible", "hidden", "disabled"], issues);
  }
}

function validateMissingTargetShape(
  path: string,
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: "must be an object" });
    return;
  }
  assertNoUnknownKeys(value, MISSING_TARGET_KEYS, path, issues);
  validateOptionalEnum(`${path}.strategy`, value.strategy, ["wait", "skip", "error"], issues);
  validateOptionalFiniteNonNegative(`${path}.timeout`, value.timeout, issues);
}

function validateScrollShape(path: string, value: unknown, issues: ConfigValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: "must be an object" });
    return;
  }
  assertNoUnknownKeys(value, SCROLL_KEYS, path, issues);
  validateOptionalEnum(`${path}.behavior`, value.behavior, ["auto", "smooth"], issues);
  validateOptionalEnum(`${path}.block`, value.block, ["start", "center", "end", "nearest"], issues);
  validateOptionalEnum(
    `${path}.inline`,
    value.inline,
    ["start", "center", "end", "nearest"],
    issues,
  );
}

function validateBehaviorShape(
  path: string,
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: "must be an object" });
    return;
  }
  assertNoUnknownKeys(value, BEHAVIOR_KEYS, path, issues);
  validateOptionalBoolean(`${path}.allowInteraction`, value.allowInteraction, issues);
  validateOptionalBoolean(`${path}.autoFocus`, value.autoFocus, issues);
  validateOptionalBoolean(`${path}.autoScroll`, value.autoScroll, issues);
  validateKeyboardShortcutsShape(`${path}.keyboard`, value.keyboard, issues);
  validateMissingTargetShape(`${path}.missingTarget`, value.missingTarget, issues);
  validateScrollShape(`${path}.scroll`, value.scroll, issues);
  validateOptionalEnum(
    `${path}.overlayClick`,
    value.overlayClick,
    ["none", "advance", "cancel"],
    issues,
  );
}

/**
 * Validates the optional `data` field: when present, must be a plain object whose values are all
 * `PrimitiveValue`s (`string | number | boolean | null`).
 * @param path Error path for this field, e.g. `steps[2].data`.
 * @param value The candidate data value.
 * @param issues Collector for every issue found.
 */
function validateDataShape(path: string, value: unknown, issues: ConfigValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: "data must be an object" });
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    const isPrimitive =
      entry === null ||
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean";
    if (!isPrimitive) {
      issues.push({
        path: `${path}.${key}`,
        message: "data values must be a string, number, boolean, or null",
      });
    }
  }
}

/**
 * Shared strict-key helper: pushes one issue per key in `value` that is not in `allowedKeys`.
 * Mirrors the small, focused validator style of `packages/core/src/options/validation.ts`, except
 * it collects into `issues` instead of throwing, since this module aggregates (see
 * `ConfigValidationError`).
 * @param value The object whose keys are being checked.
 * @param allowedKeys The complete set of keys permitted at this level.
 * @param path Error path prefix for this object (may be `""` at the top level).
 * @param issues Collector for every unknown-key issue found.
 */
function assertNoUnknownKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
  issues: ConfigValidationIssue[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) {
      issues.push({ path: path ? `${path}.${key}` : key, message: `Unknown key: ${key}` });
    }
  }
}
