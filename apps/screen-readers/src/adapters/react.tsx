import { createGlowTour, GlowTourDefault } from "@glowhop/react-tour";
import { createRoot } from "react-dom/client";
import { buildWorkflow, type MountFixture } from "../fixture";

export const mount: MountFixture = async (host) => {
  const tour = createGlowTour();
  const workflow = buildWorkflow(tour, (value) => value);
  createRoot(host).render(<GlowTourDefault tour={tour} />);
  return () => tour.run(workflow);
};
