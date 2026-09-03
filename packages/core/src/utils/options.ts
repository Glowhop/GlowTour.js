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
    gap: overrides?.gap ?? defaults?.gap,
    placementTryOrder: cloneArray(overrides?.placementTryOrder ?? defaults?.placementTryOrder),
  };
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
  const hasKeyboardShortcuts = !!defaults?.keyboardShortcuts || !!overrides?.keyboardShortcuts;

  return {
    ...mergeBaseOptions(defaults, overrides),
    arrow: hasArrow
      ? {
          disabled: overrides?.arrow?.disabled ?? defaults?.arrow?.disabled,
          color: overrides?.arrow?.color ?? defaults?.arrow?.color,
          size: overrides?.arrow?.size ?? defaults?.arrow?.size,
          borderWidth: overrides?.arrow?.borderWidth ?? defaults?.arrow?.borderWidth,
          borderRadius: overrides?.arrow?.borderRadius ?? defaults?.arrow?.borderRadius,
          edgePadding: overrides?.arrow?.edgePadding ?? defaults?.arrow?.edgePadding,
          styleNonce: overrides?.arrow?.styleNonce ?? defaults?.arrow?.styleNonce,
          disableAutoStyles:
            overrides?.arrow?.disableAutoStyles ?? defaults?.arrow?.disableAutoStyles,
        }
      : undefined,
    disableAdvanceButton: overrides?.disableAdvanceButton ?? defaults?.disableAdvanceButton,
    disablePreviousButton: overrides?.disablePreviousButton ?? defaults?.disablePreviousButton,
    gap: overrides?.gap ?? defaults?.gap,
    hideAdvanceButton: overrides?.hideAdvanceButton ?? defaults?.hideAdvanceButton,
    hideFooter: overrides?.hideFooter ?? defaults?.hideFooter,
    hidePreviousButton: overrides?.hidePreviousButton ?? defaults?.hidePreviousButton,
    placementTryOrder: cloneArray(placementTryOrder),
    keyboardShortcuts: hasKeyboardShortcuts
      ? {
          previous: cloneArray(
            overrides?.keyboardShortcuts?.previous ?? defaults?.keyboardShortcuts?.previous,
          ),
          advance: cloneArray(
            overrides?.keyboardShortcuts?.advance ?? defaults?.keyboardShortcuts?.advance,
          ),
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
    disableAutoFocus: overrides?.disableAutoFocus ?? defaults?.disableAutoFocus,
    disableAutoScroll: overrides?.disableAutoScroll ?? defaults?.disableAutoScroll,
    missingTargetStrategy: overrides?.missingTargetStrategy ?? defaults?.missingTargetStrategy,
    scroll: mergeScrollOptions(defaults?.scroll, overrides?.scroll),
    targetTimeout: overrides?.targetTimeout ?? defaults?.targetTimeout,
  };
}

function cloneArray<T>(value?: readonly T[]) {
  return value ? [...value] : undefined;
}
