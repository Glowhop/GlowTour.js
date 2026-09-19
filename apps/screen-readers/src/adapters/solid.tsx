/** @jsxImportSource solid-js */

import { createGlowTour, GlowTourDefault } from "@glowhop/solid-tour";
import { render } from "solid-js/web";
import { buildWorkflow, type MountFixture } from "../fixture";

export const mount: MountFixture = async (host) => {
  const tour = createGlowTour();
  const workflow = buildWorkflow(tour, (value) => value);
  render(() => <GlowTourDefault tour={tour} />, host);
  return () => tour.start(workflow);
};
