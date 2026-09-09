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
  integrations: [
    starlight({
      title: "GlowTour.js",
      favicon: "/favicon.png",
      logo: {
        src: "./public/glow-tour-logo.png",
        alt: "",
      },
      components: {
        SiteTitle: "./src/components/StarlightSiteTitle.astro",
        Head: "./src/components/StarlightHead.astro",
      },
      head: [
        {
          tag: "link",
          attrs: { rel: "preconnect", href: "https://fonts.googleapis.com" },
        },
        {
          tag: "link",
          attrs: { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: true },
        },
        {
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,500..700,40,1&display=swap",
          },
        },
      ],
      sidebar: [
        { label: "Overview", link: "/docs" },
        { label: "Getting started", link: "/docs/getting-started" },
        {
          label: "Frameworks",
          items: [
            { label: "Angular", link: "/docs/guides/angular" },
            { label: "React", link: "/docs/guides/react" },
            { label: "Solid", link: "/docs/guides/solid" },
            { label: "Vanilla", link: "/docs/guides/vanilla" },
            { label: "Vue", link: "/docs/guides/vue" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Theming", link: "/docs/guides/theming" },
            { label: "Accessibility", link: "/docs/guides/accessibility" },
            { label: "Positioning", link: "/docs/guides/positioning" },
            { label: "Programmatic control", link: "/docs/guides/programmatic-control" },
            { label: "Resuming a tour", link: "/docs/guides/resuming" },
            { label: "Monitoring", link: "/docs/guides/monitoring" },
            { label: "Handling errors", link: "/docs/guides/handling-errors" },
            { label: "JSON config", link: "/docs/guides/json-config" },
            { label: "SSR", link: "/docs/guides/ssr" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Builder", link: "/docs/reference/builder" },
            { label: "Tour", link: "/docs/reference/tour" },
            { label: "Angular", link: "/docs/reference/angular" },
            { label: "React", link: "/docs/reference/react" },
            { label: "Solid", link: "/docs/reference/solid" },
            { label: "Vanilla", link: "/docs/reference/vanilla" },
            { label: "Vue", link: "/docs/reference/vue" },
          ],
        },
        { label: "Compatibility", link: "/docs/compatibility" },
      ],
    }),
    react(),
    icon(),
    // Search engines drop <lastmod>-less entries into a "crawl whenever" bucket; stamping the
    // build date on every URL is honest here because the whole site is rebuilt from source on
    // each deploy. Priorities rank the marketing entry points above deep reference pages.
    sitemap({
      serialize(item) {
        const path = new URL(item.url).pathname;
        return {
          ...item,
          lastmod: new Date().toISOString(),
          changefreq: path.startsWith("/docs") ? "weekly" : "monthly",
          priority: path === "/" ? 1 : path.startsWith("/docs/reference") ? 0.5 : 0.8,
        };
      },
    }),
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
