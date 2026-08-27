import type { GlowTour, WorkflowDefinition } from "@glowhop/core-tour";

export interface LabContentFactory<TContent> {
  paragraph(text: string): TContent;
  title(method: string): TContent;
}

export interface LabSession {
  armAutomaticReturn(): void;
  beginPreviousDemo(): boolean;
  consumeAutomaticReturn(): boolean;
  reset(): void;
}

export interface LabElements {
  focusInput: HTMLInputElement;
}

export interface LabActions {
  cancelPending(): void;
  isConditionReady(): boolean;
  log(message: string): void;
  scheduleCondition(): void;
}

export type LabWorkflowFactory<TContent> = (
  tour: GlowTour<TContent>,
  elements: LabElements,
  actions: LabActions,
  session: LabSession,
  content: LabContentFactory<TContent>,
) => WorkflowDefinition<TContent>;
