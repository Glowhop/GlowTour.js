import type { TemplateRef } from "@angular/core";
import type { StartOptions, WorkflowDefinition } from "@glowhop/core-tour";
import { create, createTourStore } from "@glowhop/core-tour";

export type AngularTourContent = string | TemplateRef<unknown>;

const state = createTourStore<AngularTourContent>();

export const glowTour = {
  create(name: string, options: StartOptions = {}) {
    return create<AngularTourContent>(name, options);
  },
  run(workflow: WorkflowDefinition<AngularTourContent>) {
    return state.start(workflow);
  },
  state,
};
