import type { DynamicStepProps } from "../types";
import type { ReadonlyStepProps } from "./types";

export function cloneStepProps<T>(props: ReadonlyStepProps<T>): DynamicStepProps<T> {
  return {
    ...props,
    data: props.data === undefined ? undefined : structuredClone(props.data),
  };
}

export function freezeStepProps<T>(props: ReadonlyStepProps<T>): ReadonlyStepProps<T> {
  return Object.freeze({
    ...props,
    data: props.data === undefined ? undefined : Object.freeze(structuredClone(props.data)),
  });
}
