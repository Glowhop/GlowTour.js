import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import icon from "astro-icon";

// Starlight injects its own catch-all route ("[...slug]") at the site root, so there is no
// integration-level "base" option to scope it under a subpath. Instead, docs content lives under
// `src/content/docs/docs/` — Starlight derives each page's URL from its slug, which mirrors the
// file path relative to `src/content/docs/`, so nesting one more `docs/` folder in there produces
// `/docs/...` URLs while leaving the site root free for the marketing pages in `src/pages/`.
export default defineConfig({
  site: "https://glowtour.dev",
  // Every page is built as a directory (`/vue/index.html`), so the canonical URL of each one ends
  // in a slash. Enforcing it here makes a link written without the slash fail in dev instead of
  // costing a redirect in production.
  trailingSlash: "always",
  integrations: [
    starlight({
      title: "GlowTour.js",
      // src/pages/404.astro serves every missing page, docs included.
      disable404Route: true,
      favicon: "/favicon.png",
      logo: {
        src: "./public/glow-tour-logo.png",
        alt: "",
      },
      components: {
        SiteTitle: "./src/components/StarlightSiteTitle.astro",
        Head: "./src/components/StarlightHead.astro",
      },
      // Fraunces is self-hosted (src/styles/fonts.css) instead of loaded from Google Fonts: a
      // third-party stylesheet in the head blocks the first paint of every docs page.
      customCss: ["./src/styles/fonts.css"],
      head: [
        {
          tag: "link",
          attrs: {
            rel: "preload",
            href: "/fonts/fraunces-latin.woff2",
            as: "font",
            type: "font/woff2",
            crossorigin: true,
          },
        },
      ],
      sidebar: [
        { label: "Overview", link: "/docs/" },
        { label: "Getting started", link: "/docs/getting-started/" },
        {
          label: "Frameworks",
          items: [
            { label: "Angular", link: "/docs/guides/angular/" },
            { label: "React", link: "/docs/guides/react/" },
            { label: "Solid", link: "/docs/guides/solid/" },
            { label: "Vanilla", link: "/docs/guides/vanilla/" },
            { label: "Vue", link: "/docs/guides/vue/" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Theming", link: "/docs/guides/theming/" },
            { label: "Accessibility", link: "/docs/guides/accessibility/" },
            { label: "Positioning", link: "/docs/guides/positioning/" },
            { label: "Programmatic control", link: "/docs/guides/programmatic-control/" },
            { label: "Resuming a tour", link: "/docs/guides/resuming/" },
            { label: "Monitoring", link: "/docs/guides/monitoring/" },
            { label: "Handling errors", link: "/docs/guides/handling-errors/" },
            { label: "JSON config", link: "/docs/guides/json-config/" },
            { label: "SSR", link: "/docs/guides/ssr/" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Builder", link: "/docs/reference/builder/" },
            { label: "Tour", link: "/docs/reference/tour/" },
            { label: "Angular", link: "/docs/reference/angular/" },
            { label: "React", link: "/docs/reference/react/" },
            { label: "Solid", link: "/docs/reference/solid/" },
            { label: "Vanilla", link: "/docs/reference/vanilla/" },
            { label: "Vue", link: "/docs/reference/vue/" },
          ],
        },
        { label: "Migrating to 1.4", link: "/docs/migration/1-4/" },
        { label: "Compatibility", link: "/docs/compatibility/" },
      ],
    }),
    react(),
    icon(),
    // Only publish URL data we can keep accurate. A deployment date is not a meaningful
    // modification date for every page, and search engines calculate crawl priority themselves.
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
    // Vite's dev-time dependency scanner doesn't discover "react-dom/client" on its own here
    // (it's only reached through Astro's client-hydration script, not a statically analyzable
    // import), so without this the browser gets served react-dom's raw CJS file instead of a
    // pre-bundled ESM one and hydration fails with "does not provide an export named 'createRoot'".
    optimizeDeps: {
      include: ["react-dom/client"],
    },
  },
});
