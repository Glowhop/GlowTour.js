import type { StartOptions, WorkflowDefinition } from "@glowhop/core-tour";
import { create, createTourStore } from "@glowhop/core-tour";
import type { JSX } from "solid-js";

export type SolidTourContent = JSX.Element;

const state = createTourStore<SolidTourContent>();

export const glowTour = {
  create(name: string, options: StartOptions = {}) {
    return create<SolidTourContent>(name, options);
  },
  run(workflow: WorkflowDefinition<SolidTourContent>) {
    return state.start(workflow);
  },
  state,
};
