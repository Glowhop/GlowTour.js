/** @jsxImportSource solid-js */

import { createGlowTour, DefaultTour } from "@glowhop/solid-tour";
import { render } from "solid-js/web";
import { buildWorkflow, type MountFixture } from "../fixture";

export const mount: MountFixture = async (host) => {
  const tour = createGlowTour();
  const workflow = buildWorkflow(tour, (value) => value);
  render(() => <DefaultTour tour={tour} />, host);
  return () => tour.run(workflow);
};
