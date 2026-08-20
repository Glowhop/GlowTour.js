import type { ActiveStep } from "../runtime/active-step";
import type { TourDirection } from "../types";

export interface TourViewDriver<T> {
  show(step: ActiveStep<T>, direction: TourDirection, signal: AbortSignal): Promise<void> | void;
  clear(signal: AbortSignal): Promise<void> | void;
  dispose(): void;
}

export class NoopTourViewDriver<T> implements TourViewDriver<T> {
  show(_step: ActiveStep<T>, _direction: TourDirection, _signal: AbortSignal): void {}

  clear(_signal: AbortSignal): void {}

  dispose(): void {}
}
