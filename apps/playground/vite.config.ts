import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({ include: /\/react\/.*\.[jt]sx$/ }),
    solid({ include: /\/solid\/.*\.[jt]sx$/ }),
    vue(),
  ],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        react: resolve(__dirname, "react/index.html"),
        reactUseGlowTour: resolve(__dirname, "react/use-glow-tour.html"),
        solid: resolve(__dirname, "solid/index.html"),
        solidUseGlowTour: resolve(__dirname, "solid/use-glow-tour.html"),
        vue: resolve(__dirname, "vue/index.html"),
        vueUseGlowTour: resolve(__dirname, "vue/use-glow-tour.html"),
        angular: resolve(__dirname, "angular/index.html"),
        angularUseGlowTour: resolve(__dirname, "angular/use-glow-tour.html"),
        vanilla: resolve(__dirname, "vanilla/index.html"),
        multipage: resolve(__dirname, "multipage/index.html"),
        multipageB: resolve(__dirname, "multipage/page-b.html"),
      },
    },
  },
});
