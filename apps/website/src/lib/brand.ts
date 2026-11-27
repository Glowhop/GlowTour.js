// Spellings people search for the library under. Used as schema.org `alternateName` on the site and
// software entities so search engines and assistants map them all to GlowTour.js. Keep it to real
// variants of the brand name: per-framework names belong on each adapter page, not here.
export const SITE_ALTERNATE_NAMES = ["GlowTour", "Glow Tour", "Glow Tour JS"];

/** Variants for one adapter page, e.g. "GlowTour React" and "Glow Tour React". */
export function frameworkAlternateNames(framework: string): string[] {
  return [`GlowTour ${framework}`, `Glow Tour ${framework}`];
}
