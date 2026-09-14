import {
  createDefaultTourElement,
  createGlowTour,
  registerGlowTourElements,
} from "@glowhop/vanilla-tour";
import { buildWorkflow, type MountFixture } from "../fixture";

export const mount: MountFixture = async (host) => {
  registerGlowTourElements();
  const tour = createGlowTour();
  const workflow = buildWorkflow(tour, (value) => value);
  host.append(createDefaultTourElement(tour));
  return () => tour.run(workflow);
};
