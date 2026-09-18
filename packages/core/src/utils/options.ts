import type { ReadonlyStepProps } from "../definition";
import type {
  AnimationOptions,
  BaseOptions,
  IndicatorOptions,
  MissingTargetOptions,
  OverlayOptions,
  PopoverOptions,
  ScrollOptions,
  StepBehavior,
  StepPropsPatch,
  TourClassNames,
} from "../types";

/**
 * Merges a partial change into step props: fields it leaves out are kept, `data` is merged key by
 * key, `overlay` / `popover` / `indicator` / `behavior` go through their option merges, `classNames` is
 * merged per component, and arrays are replaced.
 * Builds a step's initial props over the workflow defaults, and backs `StepPropsStore.update`.
 */
export function mergeStepProps<T>(
  base: StepPropsPatch<T>,
  patch: StepPropsPatch<T>,
): ReadonlyStepProps<T> {
  return {
    ...base,
    ...patch,
    data: patch.data ? { ...base.data, ...patch.data } : base.data,
    overlay: mergeOverlayOptions(base.overlay, patch.overlay),
    popover: mergePopoverOptions(base.popover, patch.popover),
    indicator: mergeIndicatorOptions(base.indicator, patch.indicator),
    behavior: mergeStepBehavior(base.behavior, patch.behavior),
    classNames: mergeClassNames(base.classNames, patch.classNames),
  } as ReadonlyStepProps<T>;
}

/** Merges `classNames` per component: a component the patch leaves out or sets to `undefined` keeps its classes. */
function mergeClassNames(base?: TourClassNames, patch?: TourClassNames) {
  if (!patch) return base;
  const merged: TourClassNames = { ...base };
  for (const slot in patch) {
    const key = slot as keyof TourClassNames;
    merged[key] = patch[key] ?? merged[key];
  }
  return merged;
}

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
    hidden: overrides?.hidden ?? defaults?.hidden,
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

  return {
    ...mergeBaseOptions(defaults, overrides),
    arrow: hasArrow
      ? {
          hidden: overrides?.arrow?.hidden ?? defaults?.arrow?.hidden,
          color: overrides?.arrow?.color ?? defaults?.arrow?.color,
          size: overrides?.arrow?.size ?? defaults?.arrow?.size,
          borderWidth: overrides?.arrow?.borderWidth ?? defaults?.arrow?.borderWidth,
          borderRadius: overrides?.arrow?.borderRadius ?? defaults?.arrow?.borderRadius,
          edgePadding: overrides?.arrow?.edgePadding ?? defaults?.arrow?.edgePadding,
          styleNonce: overrides?.arrow?.styleNonce ?? defaults?.arrow?.styleNonce,
          autoStyles: overrides?.arrow?.autoStyles ?? defaults?.arrow?.autoStyles,
        }
      : undefined,
    controls: mergeCommands(defaults?.controls, overrides?.controls, (state) => state),
    gap: overrides?.gap ?? defaults?.gap,
    placementTryOrder: cloneArray(placementTryOrder),
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
    allowScroll: overrides?.allowScroll ?? defaults?.allowScroll,
    autoFocus: overrides?.autoFocus ?? defaults?.autoFocus,
    autoScroll: overrides?.autoScroll ?? defaults?.autoScroll,
    keyboard: mergeCommands(defaults?.keyboard, overrides?.keyboard, cloneArray),
    missingTarget: mergeMissingTarget(defaults?.missingTarget, overrides?.missingTarget),
    scroll: mergeScrollOptions(defaults?.scroll, overrides?.scroll),
    overlayClick: overrides?.overlayClick ?? defaults?.overlayClick,
  };
}

/** Merges a value per navigation command, such as `behavior.keyboard` or `popover.controls`. */
function mergeCommands<V>(
  defaults: { readonly previous?: V; readonly advance?: V; readonly cancel?: V } | undefined,
  overrides: { readonly previous?: V; readonly advance?: V; readonly cancel?: V } | undefined,
  copy: (value: V | undefined) => V | undefined,
) {
  if (!defaults && !overrides) return undefined;
  return {
    previous: copy(overrides?.previous ?? defaults?.previous),
    advance: copy(overrides?.advance ?? defaults?.advance),
    cancel: copy(overrides?.cancel ?? defaults?.cancel),
  };
}

function mergeMissingTarget(
  defaults?: MissingTargetOptions,
  overrides?: MissingTargetOptions,
): MissingTargetOptions | undefined {
  if (!defaults && !overrides) return undefined;
  return {
    strategy: overrides?.strategy ?? defaults?.strategy,
    timeout: overrides?.timeout ?? defaults?.timeout,
  };
}

function cloneArray<T>(value?: readonly T[]) {
  return value ? [...value] : undefined;
}

/** Whether a popover control is visible and enabled, so the popover UI may run its command. */
export function isControlAvailable(
  props:
    | {
        readonly popover?: {
          readonly controls?: {
            readonly advance?: string;
            readonly previous?: string;
            readonly cancel?: string;
          };
        };
      }
    | undefined,
  command: "advance" | "previous" | "cancel",
) {
  return props !== undefined && (props.popover?.controls?.[command] ?? "visible") === "visible";
}
