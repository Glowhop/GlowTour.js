import type { StartOptions, WorkflowDefinition } from "@glowhop/core-tour";
import { create, createTourStore } from "@glowhop/core-tour";

export type VanillaTourContent = string | Node;

const state = createTourStore<VanillaTourContent>();

export const glowTour = {
  create(name: string, options: StartOptions = {}) {
    return create<VanillaTourContent>(name, options);
  },
  run(workflow: WorkflowDefinition<VanillaTourContent>) {
    return state.start(workflow);
  },
  state,
};
