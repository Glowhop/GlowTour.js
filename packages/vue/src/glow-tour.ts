import type { StartOptions, WorkflowDefinition } from "@glowhop/core-tour";
import { create, createTourStore } from "@glowhop/core-tour";
import type { VNodeChild } from "vue";

export type VueTourContent = VNodeChild;

const state = createTourStore<VueTourContent>();

export const glowTour = {
  create(name: string, options: StartOptions = {}) {
    return create<VueTourContent>(name, options);
  },
  run(workflow: WorkflowDefinition<VueTourContent>) {
    return state.start(workflow);
  },
  state,
};
