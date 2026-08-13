import type { StartOptions, WorkflowDefinition } from "@glowhop/core-tour";
import { create, createTourStore } from "@glowhop/core-tour";
import type { ReactNode } from "react";

export type ReactTourContent = ReactNode;

const state = createTourStore<ReactTourContent>();

export const glowTour = {
  create(name: string, options: StartOptions = {}) {
    return create<ReactTourContent>(name, options);
  },
  run(workflow: WorkflowDefinition<ReactTourContent>) {
    return state.start(workflow);
  },
  state,
};
