export type { GlowTourRootElement } from "./components/web-components";
export { GLOW_TOUR_ELEMENT_NAMES } from "./components/web-components";
export type { VanillaGlowTour, VanillaTourContent } from "./glow-tour";
export { createGlowTour } from "./glow-tour";

import { registerGlowTourElements } from "./components/web-components";

registerGlowTourElements();
