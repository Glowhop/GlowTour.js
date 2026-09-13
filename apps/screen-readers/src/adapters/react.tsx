import { createGlowTour, DefaultTour } from "@glowhop/react-tour";
import { createRoot } from "react-dom/client";
import { buildWorkflow, type MountFixture } from "../fixture";

export const mount: MountFixture = async (host) => {
  const tour = createGlowTour();
  const workflow = buildWorkflow(tour, (value) => value);
  createRoot(host).render(<DefaultTour tour={tour} />);
  return () => tour.run(workflow);
};
