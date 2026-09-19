export default defineNuxtConfig({
  compatibilityDate: "2026-01-01",
  css: ["@glowhop/styles-tour/default.css"],
  devtools: { enabled: false },
  imports: {
    presets: [{ from: "@glowhop/vue-tour", imports: ["createGlowTour", "useGlowTour"] }],
  },
  telemetry: false,
});
