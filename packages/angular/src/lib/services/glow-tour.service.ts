import { Injectable } from "@angular/core";
import type { StartOptions, WorkflowDefinition } from "@glowhop/core-tour";
import type { AngularTourContent } from "../glow-tour";
import { glowTour } from "../glow-tour";

@Injectable({ providedIn: "root" })
export class GlowTourService {
  readonly state = glowTour.state;

  create(name: string, options: StartOptions = {}) {
    return glowTour.create(name, options);
  }

  run(workflow: WorkflowDefinition<AngularTourContent>) {
    return glowTour.run(workflow);
  }
}
