import type {
  AnimationOptions,
  BaseOptions,
  IndicatorOptions,
  OverlayOptions,
  PopoverOptions,
  ScrollOptions,
  StepBehavior,
} from "../types";

export function mergeOverlayOptions(
  defaults?: OverlayOptions,
  overrides?: OverlayOptions,
): OverlayOptions | undefined {
  if (!defaults && !overrides) {
    return undefined;
  }

  return {
    ...mergeBaseOptions(defaults, overrides),
    color: overrides?.color ?? defaults?.color,
    opacity: overrides?.opacity ?? defaults?.opacity,
    padding: overrides?.padding ?? defaults?.padding,
    radius: overrides?.radius ?? defaults?.radius,
  };
}

export function mergeIndicatorOptions(
  defaults?: IndicatorOptions,
  overrides?: IndicatorOptions,
): IndicatorOptions | undefined {
  if (!defaults && !overrides) {
    return undefined;
  }

  return {
    ...mergeBaseOptions(defaults, overrides),
    disabled: overrides?.disabled ?? defaults?.disabled,
    gap: normalizeGap(overrides?.gap ?? defaults?.gap),
    placementTryOrder: cloneArray(overrides?.placementTryOrder ?? defaults?.placementTryOrder),
  };
}

function normalizeGap(value?: number) {
  return value === undefined ? undefined : Math.max(0, value);
}

export function mergePopoverOptions(
  defaults?: PopoverOptions,
  overrides?: PopoverOptions,
): PopoverOptions | undefined {
  if (!defaults && !overrides) {
    return undefined;
  }

  const placementTryOrder = overrides?.placementTryOrder ?? defaults?.placementTryOrder;
  const hasArrow = !!defaults?.arrow || !!overrides?.arrow;
  const hasButtons = !!defaults?.buttons || !!overrides?.buttons;
  const hasKeyboardShortcuts = !!defaults?.keyboardShortcuts || !!overrides?.keyboardShortcuts;

  return {
    ...mergeBaseOptions(defaults, overrides),
    arrow: hasArrow
      ? {
          disabled: overrides?.arrow?.disabled ?? defaults?.arrow?.disabled,
          color: overrides?.arrow?.color ?? defaults?.arrow?.color,
          size: normalizeGap(overrides?.arrow?.size ?? defaults?.arrow?.size),
          borderWidth: normalizeGap(overrides?.arrow?.borderWidth ?? defaults?.arrow?.borderWidth),
          borderRadius: normalizeGap(
            overrides?.arrow?.borderRadius ?? defaults?.arrow?.borderRadius,
          ),
          edgePadding: normalizeGap(overrides?.arrow?.edgePadding ?? defaults?.arrow?.edgePadding),
        }
      : undefined,
    disableAutoFocus: overrides?.disableAutoFocus ?? defaults?.disableAutoFocus,
    hideProgressIndicator: overrides?.hideProgressIndicator ?? defaults?.hideProgressIndicator,
    gap: overrides?.gap ?? defaults?.gap,
    placementTryOrder: cloneArray(placementTryOrder),
    buttons: hasButtons
      ? {
          backLabel: overrides?.buttons?.backLabel ?? defaults?.buttons?.backLabel,
          nextLabel: overrides?.buttons?.nextLabel ?? defaults?.buttons?.nextLabel,
          finishLabel: overrides?.buttons?.finishLabel ?? defaults?.buttons?.finishLabel,
        }
      : undefined,
    keyboardShortcuts: hasKeyboardShortcuts
      ? {
          back: cloneArray(overrides?.keyboardShortcuts?.back ?? defaults?.keyboardShortcuts?.back),
          next: cloneArray(overrides?.keyboardShortcuts?.next ?? defaults?.keyboardShortcuts?.next),
          cancel: cloneArray(
            overrides?.keyboardShortcuts?.cancel ?? defaults?.keyboardShortcuts?.cancel,
          ),
        }
      : undefined,
  };
}

export function mergeScrollOptions(
  defaults?: ScrollOptions,
  overrides?: ScrollOptions,
): ScrollOptions | undefined {
  if (!defaults && !overrides) {
    return undefined;
  }
  return {
    behavior: overrides?.behavior ?? defaults?.behavior,
    block: overrides?.block ?? defaults?.block,
    inline: overrides?.inline ?? defaults?.inline,
  };
}

export function mergeAnimationOptions(
  defaults?: AnimationOptions,
  overrides?: AnimationOptions,
): AnimationOptions | undefined {
  if (!defaults) {
    return overrides ? { ...overrides } : undefined;
  }
  if (!overrides) {
    return { ...defaults };
  }
  return {
    duration: overrides.duration ?? defaults.duration,
    easing: overrides.easing ?? defaults.easing,
  };
}

function mergeBaseOptions(defaults?: BaseOptions, overrides?: BaseOptions): BaseOptions {
  return {
    animated: overrides?.animated ?? defaults?.animated,
    animation: mergeAnimationOptions(defaults?.animation, overrides?.animation),
  };
}

export function mergeStepBehavior(
  defaults?: StepBehavior,
  overrides?: StepBehavior,
): StepBehavior | undefined {
  if (!defaults && !overrides) {
    return undefined;
  }
  return {
    allowInteraction: overrides?.allowInteraction ?? defaults?.allowInteraction,
    missingTargetStrategy: overrides?.missingTargetStrategy ?? defaults?.missingTargetStrategy,
    targetTimeout: overrides?.targetTimeout ?? defaults?.targetTimeout,
  };
}

function cloneArray<T>(value?: readonly T[]) {
  return value ? [...value] : undefined;
}
