import { createGlowTour, GlowTourDefault } from "@glowhop/vue-tour";
import { createApp, h } from "vue";
import { buildWorkflow, type MountFixture } from "../fixture";

export const mount: MountFixture = async (host) => {
  const tour = createGlowTour();
  const workflow = buildWorkflow(tour, (value) => value);
  createApp({ render: () => h(GlowTourDefault, { tour }) }).mount(host);
  return () => tour.run(workflow);
};
