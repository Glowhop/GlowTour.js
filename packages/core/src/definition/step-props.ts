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
      keyboardShortcuts: props.popover.keyboardShortcuts && {
        previous: props.popover.keyboardShortcuts.previous && [
          ...props.popover.keyboardShortcuts.previous,
        ],
        advance: props.popover.keyboardShortcuts.advance && [
          ...props.popover.keyboardShortcuts.advance,
        ],
        cancel: props.popover.keyboardShortcuts.cancel && [
          ...props.popover.keyboardShortcuts.cancel,
        ],
      },
      placementTryOrder: props.popover.placementTryOrder && [...props.popover.placementTryOrder],
    },
    indicator: props.indicator && {
      ...props.indicator,
      animation: props.indicator.animation && { ...props.indicator.animation },
      placementTryOrder: props.indicator.placementTryOrder && [
        ...props.indicator.placementTryOrder,
      ],
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
  if (cloned.popover?.keyboardShortcuts?.previous)
    Object.freeze(cloned.popover.keyboardShortcuts.previous);
  if (cloned.popover?.keyboardShortcuts?.advance)
    Object.freeze(cloned.popover.keyboardShortcuts.advance);
  if (cloned.popover?.keyboardShortcuts?.cancel)
    Object.freeze(cloned.popover.keyboardShortcuts.cancel);
  if (cloned.popover?.keyboardShortcuts) Object.freeze(cloned.popover.keyboardShortcuts);
  if (cloned.popover?.placementTryOrder) Object.freeze(cloned.popover.placementTryOrder);
  if (cloned.popover) Object.freeze(cloned.popover);
  if (cloned.indicator?.animation) Object.freeze(cloned.indicator.animation);
  if (cloned.indicator?.placementTryOrder) Object.freeze(cloned.indicator.placementTryOrder);
  if (cloned.indicator) Object.freeze(cloned.indicator);
  return Object.freeze(cloned);
}
