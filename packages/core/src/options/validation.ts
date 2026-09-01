import type { ReadonlyStepProps, WorkflowDefinition } from "../definition";

type AnimationWithDuration = {
  readonly duration?: number;
};

type BaseOptionsWithAnimation = {
  readonly animation?: AnimationWithDuration;
};

type OverlayOptionsForValidation = BaseOptionsWithAnimation & {
  readonly opacity?: number;
  readonly padding?: number;
  readonly radius?: number;
};

type PopoverOptionsForValidation = BaseOptionsWithAnimation & {
  readonly arrow?: {
    readonly borderRadius?: number;
    readonly borderWidth?: number;
    readonly edgePadding?: number;
    readonly size?: number;
  };
  readonly gap?: number;
};

type IndicatorOptionsForValidation = BaseOptionsWithAnimation & {
  readonly gap?: number;
};

function invalidOption(path: string): TypeError {
  return new TypeError(`Invalid option: ${path}`);
}

function validateFiniteNonNegative(path: string, value: number | undefined): void {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw invalidOption(path);
}

function validateAnimation(path: string, animation: AnimationWithDuration | undefined): void {
  if (animation?.duration === undefined && animation !== undefined)
    throw invalidOption(`${path}.duration`);
  validateFiniteNonNegative(`${path}.duration`, animation?.duration);
}

function validateOverlay(path: string, overlay: OverlayOptionsForValidation | undefined): void {
  if (!overlay) return;
  validateAnimation(`${path}.animation`, overlay.animation);
  validateFiniteNonNegative(`${path}.padding`, overlay.padding);
  validateFiniteNonNegative(`${path}.radius`, overlay.radius);
  const opacity = overlay.opacity;
  if (opacity !== undefined && (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)) {
    throw invalidOption(`${path}.opacity`);
  }
}

function validatePopover(path: string, popover: PopoverOptionsForValidation | undefined): void {
  if (!popover) return;
  validateAnimation(`${path}.animation`, popover.animation);
  validateFiniteNonNegative(`${path}.gap`, popover.gap);
  if (!popover.arrow) return;
  validateFiniteNonNegative(`${path}.arrow.size`, popover.arrow.size);
  validateFiniteNonNegative(`${path}.arrow.borderWidth`, popover.arrow.borderWidth);
  validateFiniteNonNegative(`${path}.arrow.borderRadius`, popover.arrow.borderRadius);
  validateFiniteNonNegative(`${path}.arrow.edgePadding`, popover.arrow.edgePadding);
}

function validateIndicator(
  path: string,
  indicator: IndicatorOptionsForValidation | undefined,
): void {
  if (!indicator) return;
  validateAnimation(`${path}.animation`, indicator.animation);
  validateFiniteNonNegative(`${path}.gap`, indicator.gap);
}

function validateBehavior(
  path: string,
  behavior: { readonly targetTimeout?: number } | undefined,
): void {
  validateFiniteNonNegative(`${path}.targetTimeout`, behavior?.targetTimeout);
}

export function validateStepProps<T>(path: string, props: ReadonlyStepProps<T>): void {
  validateOverlay(`${path}.overlay`, props.overlay);
  validatePopover(`${path}.popover`, props.popover);
  validateIndicator(`${path}.indicator`, props.indicator);
}

export function validateWorkflowOptions<T>(workflow: WorkflowDefinition<T>): void {
  validateOverlay("options.overlay", workflow.options.overlay);
  validatePopover("options.popover", workflow.options.popover);
  validateIndicator("options.indicator", workflow.options.indicator);
  validateBehavior("options.behavior", workflow.options.behavior);
  for (const [index, step] of workflow.steps.entries()) {
    const path = `steps[${index}]`;
    validateBehavior(`${path}.behavior`, step.behavior);
    validateStepProps(path, step.props);
  }
}
