import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

/*
 * The whole documentation as one Markdown file, for assistants and tools that read llms.txt
 * (https://llmstxt.org). public/llms.txt is the index; this is the full text it points to, built
 * from the same Markdown sources as the docs pages so the two cannot drift.
 *
 * Pages are ordered the way the sidebar teaches them. A page missing from ORDER still ships, after
 * the listed ones, so adding a doc never silently drops it from this file.
 */
const ORDER = [
  "docs",
  "docs/getting-started",
  "docs/guides/react",
  "docs/guides/vue",
  "docs/guides/angular",
  "docs/guides/solid",
  "docs/guides/vanilla",
  "docs/guides/theming",
  "docs/guides/accessibility",
  "docs/guides/positioning",
  "docs/guides/programmatic-control",
  "docs/guides/resuming",
  "docs/guides/monitoring",
  "docs/guides/handling-errors",
  "docs/guides/json-config",
  "docs/guides/ssr",
  "docs/reference/builder",
  "docs/reference/tour",
  "docs/reference/react",
  "docs/reference/vue",
  "docs/reference/angular",
  "docs/reference/solid",
  "docs/reference/vanilla",
  "docs/migration/1-4",
  "docs/compatibility",
];

const rank = (id: string) => {
  const index = ORDER.indexOf(id);
  return index === -1 ? ORDER.length : index;
};

export const GET: APIRoute = async ({ site }) => {
  const entries = (await getCollection("docs")).sort(
    (a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id),
  );

  const sections = entries.map((entry) => {
    const url = new URL(`/${entry.id}/`, site).href;
    return [
      `# ${entry.data.title}`,
      "",
      `URL: ${url}`,
      entry.data.description ? `\n> ${entry.data.description}` : "",
      "",
      (entry.body ?? "").trim(),
    ].join("\n");
  });

  const header = [
    "# GlowTour.js documentation (full text)",
    "",
    "> GlowTour.js is an open-source, MIT-licensed product tour library for JavaScript and",
    "> TypeScript: onboarding tours, guided tours and feature highlights for React, Vue, Angular,",
    "> Solid and vanilla JavaScript, with one core engine and a native adapter per framework.",
    "",
    `Index: ${new URL("/llms.txt", site).href}`,
  ].join("\n");

  return new Response(`${[header, ...sections].join("\n\n---\n\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
