import type { ReadonlyStepProps, StepProps } from "./types";

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
      controls: props.popover.controls && { ...props.popover.controls },
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
      keyboard: props.behavior.keyboard && {
        previous: props.behavior.keyboard.previous && [...props.behavior.keyboard.previous],
        advance: props.behavior.keyboard.advance && [...props.behavior.keyboard.advance],
        cancel: props.behavior.keyboard.cancel && [...props.behavior.keyboard.cancel],
      },
      missingTarget: props.behavior.missingTarget && { ...props.behavior.missingTarget },
      scroll: props.behavior.scroll && { ...props.behavior.scroll },
    },
  };
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
  if (cloned.popover?.controls) Object.freeze(cloned.popover.controls);
  if (cloned.popover?.placementTryOrder) Object.freeze(cloned.popover.placementTryOrder);
  if (cloned.popover) Object.freeze(cloned.popover);
  if (cloned.indicator?.animation) Object.freeze(cloned.indicator.animation);
  if (cloned.indicator?.placementTryOrder) Object.freeze(cloned.indicator.placementTryOrder);
  if (cloned.indicator) Object.freeze(cloned.indicator);
  if (cloned.behavior?.keyboard?.previous) Object.freeze(cloned.behavior.keyboard.previous);
  if (cloned.behavior?.keyboard?.advance) Object.freeze(cloned.behavior.keyboard.advance);
  if (cloned.behavior?.keyboard?.cancel) Object.freeze(cloned.behavior.keyboard.cancel);
  if (cloned.behavior?.keyboard) Object.freeze(cloned.behavior.keyboard);
  if (cloned.behavior?.missingTarget) Object.freeze(cloned.behavior.missingTarget);
  if (cloned.behavior?.scroll) Object.freeze(cloned.behavior.scroll);
  if (cloned.behavior) Object.freeze(cloned.behavior);
  return Object.freeze(cloned);
}
