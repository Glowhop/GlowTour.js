export default defineNuxtPlugin(() => ({
  provide: { glowTour: createGlowTour() },
}));
