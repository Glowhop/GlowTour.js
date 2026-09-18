import type { TourClassNames, TourControl, TourControls } from "../types";
import type { DeepReadonly, ReadonlyStepProps, StepProps } from "./types";

/**
 * Creates a shallow clone of step properties with deep clones of nested objects.
 * @param props The properties to clone.
 * @returns A mutable copy of the properties.
 */
export function cloneStepProps<T>(props: ReadonlyStepProps<T>): StepProps<T> {
  return {
    title: props.title,
    content: props.content,
    data: props.data === undefined ? undefined : structuredClone(props.data),
    overlay: props.overlay && {
      ...props.overlay,
      animation: props.overlay.animation && { ...props.overlay.animation },
    },
    popover: props.popover && {
      ...props.popover,
      animation: props.popover.animation && { ...props.popover.animation },
      arrow: props.popover.arrow && { ...props.popover.arrow },
      placementTryOrder: props.popover.placementTryOrder && [...props.popover.placementTryOrder],
    },
    indicator: props.indicator && {
      ...props.indicator,
      animation: props.indicator.animation && { ...props.indicator.animation },
      placementTryOrder: props.indicator.placementTryOrder && [
        ...props.indicator.placementTryOrder,
      ],
    },
    behavior: props.behavior && {
      ...props.behavior,
      missingTarget: props.behavior.missingTarget && { ...props.behavior.missingTarget },
      scroll: props.behavior.scroll && { ...props.behavior.scroll },
    },
    controls: cloneControls(props.controls),
    classNames: cloneClassNames(props.classNames),
  };
}

/** Copies `controls` into frozen records, with frozen copies of their `keys`. */
export function cloneControls(
  controls: DeepReadonly<TourControls> | undefined,
): TourControls | undefined {
  return (
    controls &&
    Object.freeze({
      previous: cloneControl(controls.previous),
      advance: cloneControl(controls.advance),
      cancel: cloneControl(controls.cancel),
    })
  );
}

function cloneControl(control: DeepReadonly<TourControl> | undefined): TourControl | undefined {
  return (
    control &&
    Object.freeze({ state: control.state, keys: control.keys && Object.freeze([...control.keys]) })
  );
}

/**
 * Copies `classNames` into a frozen record. Its class arrays are shared rather than copied: they are
 * typed readonly and nothing in the tour writes to them, and copying them costs bundle size.
 */
export function cloneClassNames(
  classNames: TourClassNames | undefined,
): TourClassNames | undefined {
  return classNames && Object.freeze({ ...classNames });
}

/**
 * Creates a deep-frozen copy of step properties.
 * @param props The properties to freeze.
 * @returns An immutable copy of the properties.
 */
export function freezeStepProps<T>(props: ReadonlyStepProps<T>): ReadonlyStepProps<T> {
  const cloned = cloneStepProps(props);
  if (cloned.data) Object.freeze(cloned.data);
  if (cloned.overlay?.animation) Object.freeze(cloned.overlay.animation);
  if (cloned.overlay) Object.freeze(cloned.overlay);
  if (cloned.popover?.animation) Object.freeze(cloned.popover.animation);
  if (cloned.popover?.arrow) Object.freeze(cloned.popover.arrow);
  if (cloned.popover?.placementTryOrder) Object.freeze(cloned.popover.placementTryOrder);
  if (cloned.popover) Object.freeze(cloned.popover);
  if (cloned.indicator?.animation) Object.freeze(cloned.indicator.animation);
  if (cloned.indicator?.placementTryOrder) Object.freeze(cloned.indicator.placementTryOrder);
  if (cloned.indicator) Object.freeze(cloned.indicator);
  if (cloned.behavior?.missingTarget) Object.freeze(cloned.behavior.missingTarget);
  if (cloned.behavior?.scroll) Object.freeze(cloned.behavior.scroll);
  if (cloned.behavior) Object.freeze(cloned.behavior);
  return Object.freeze(cloned);
}
