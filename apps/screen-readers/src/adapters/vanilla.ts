import { createGlowTour, registerGlowTourElements } from "@glowhop/vanilla-tour";
import { buildWorkflow, type MountFixture } from "../fixture";

export const mount: MountFixture = async (host) => {
  registerGlowTourElements();
  const tour = createGlowTour();
  const workflow = buildWorkflow(tour, (value) => value);
  const element = document.createElement("glow-tour-default");
  element.tour = tour;
  host.append(element);
  return () => tour.run(workflow);
};
