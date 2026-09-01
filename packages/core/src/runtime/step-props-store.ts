import { freezeStepProps, type ReadonlyStepProps } from "../definition";
import { validateStepProps } from "../options/validation";
import type { StepPropsStore, StepPropsUpdate } from "../types";

export function createStepPropsStore<T>(
  initialProps: ReadonlyStepProps<T>,
  reportListenerError: (error: unknown) => void,
  path = "steps[0]",
): StepPropsStore<T> {
  let current = freezeStepProps(initialProps);
  const listeners = new Set<(props: ReadonlyStepProps<T>) => void>();

  const notify = (listener: (props: ReadonlyStepProps<T>) => void, props: ReadonlyStepProps<T>) => {
    try {
      listener(props);
    } catch (error) {
      try {
        reportListenerError(error);
      } catch {
        // Error reporting must not block the remaining subscribers.
      }
    }
  };

  return Object.freeze({
    get: () => current,
    set: (update: StepPropsUpdate<T>) => {
      const next = typeof update === "function" ? update(current) : update;
      validateStepProps(path, next);
      current = freezeStepProps(next);
      const published = current;
      for (const listener of Array.from(listeners)) notify(listener, published);
    },
    subscribe: (listener: (props: ReadonlyStepProps<T>) => void) => {
      notify(listener, current);
      listeners.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },
  });
}
