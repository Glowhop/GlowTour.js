export * from "@glowhop/core-tour";
export * from "./components/web-components";
export type { VanillaTourContent } from "./glow-tour";
export { glowTour } from "./glow-tour";

import { registerGlowTourElements } from "./components/web-components";

registerGlowTourElements();
