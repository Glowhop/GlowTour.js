/**
 * Data behind every comparison on the site (the home page's compact table, /compare, and the
 * "GlowTour.js vs X" pages), kept in one place so they can never disagree about a value.
 *
 * Every value was checked against the other projects' official docs and published source, not
 * against third-party roundups. When a library ships a new major version, re-check its column and
 * bump COMPARISON_CHECKED_ON and its checkedVersion; both are printed under the table.
 */

export type LibraryKey = "glowtour" | "driver" | "shepherd" | "joyride";
export type CompetitorKey = Exclude<LibraryKey, "glowtour">;

export interface SourceLink {
  label: string;
  href: string;
}

/** How a library is pictured next to its name: an image under public/, or a single emoji. */
export type LibraryMark = { type: "image"; src: string } | { type: "emoji"; emoji: string };

export interface ComparedLibrary {
  key: LibraryKey;
  name: string;
  mark: LibraryMark;
  /** Path of the "GlowTour.js vs X" page. Omitted for GlowTour.js itself. */
  path?: string;
  /** The version the column values were verified against. Omitted for GlowTour.js itself. */
  checkedVersion?: string;
  sources: readonly SourceLink[];
}

const LIBRARIES: Record<LibraryKey, ComparedLibrary> = {
  glowtour: {
    key: "glowtour",
    name: "GlowTour.js",
    mark: { type: "image", src: "/glow-tour-logo.png" },
    sources: [
      { label: "Compatibility", href: "/docs/compatibility" },
      { label: "Builder API", href: "/docs/reference/builder" },
      { label: "Accessibility guide", href: "/docs/guides/accessibility" },
      { label: "GitHub", href: "https://github.com/Glowhop/GlowTour.js" },
    ],
  },
  driver: {
    key: "driver",
    name: "Driver.js",
    mark: { type: "emoji", emoji: "🦊" },
    path: "/glowtour-vs-driver-js",
    checkedVersion: "1.8.0",
    sources: [
      { label: "Theming docs", href: "https://driverjs.com/docs/theming" },
      { label: "GitHub", href: "https://github.com/kamranahmedse/driver.js" },
      {
        label: "Open accessibility issue #434",
        href: "https://github.com/nilbuild/driver.js/issues/434",
      },
    ],
  },
  shepherd: {
    key: "shepherd",
    name: "Shepherd.js",
    mark: { type: "image", src: "/compare/shepherd.svg" },
    path: "/glowtour-vs-shepherd-js",
    checkedVersion: "15.3.0",
    sources: [
      { label: "Website", href: "https://shepherdjs.dev/" },
      { label: "GitHub", href: "https://github.com/shipshapecode/shepherd" },
    ],
  },
  joyride: {
    key: "joyride",
    name: "React Joyride",
    mark: { type: "image", src: "/compare/react-joyride.svg" },
    path: "/glowtour-vs-react-joyride",
    checkedVersion: "3.2.0",
    sources: [{ label: "GitHub", href: "https://github.com/gilbarbara/react-joyride" }],
  },
};

export const COMPETITOR_KEYS: readonly CompetitorKey[] = ["driver", "shepherd", "joyride"];

export const getLibrary = (key: LibraryKey): ComparedLibrary => LIBRARIES[key];

export const COMPARISON_CHECKED_ON = "September 2026";

/**
 * "partial" covers anything that works but not first-hand: an integration through the generic
 * JavaScript API, customization that needs DOM work, or a license with conditions. The label next
 * to it always says which, so the marker never has to carry the nuance on its own.
 */
export type Support = "yes" | "partial" | "no";

export const SUPPORT_LEGEND: readonly { support: Support; emoji: string; label: string }[] = [
  { support: "yes", emoji: "✅", label: "Built in" },
  { support: "partial", emoji: "🟡", label: "Possible, with caveats" },
  { support: "no", emoji: "❌", label: "Not supported" },
];

export interface ComparisonCell {
  support: Support;
  label: string;
}

const yes = (label = "Yes"): ComparisonCell => ({ support: "yes", label });
const partial = (label: string): ComparisonCell => ({ support: "partial", label });
const no = (label = "No"): ComparisonCell => ({ support: "no", label });

export interface ComparisonRow {
  feature: string;
  values: Record<LibraryKey, ComparisonCell>;
}

export const COMPARISON_ROWS: readonly ComparisonRow[] = [
  {
    feature: "Vanilla JS",
    values: {
      glowtour: yes("Native (custom elements)"),
      driver: yes("Native"),
      shepherd: yes("Native"),
      joyride: no(),
    },
  },
  {
    feature: "React",
    values: {
      glowtour: yes("Native integration"),
      driver: partial("Compatible, no native adapter"),
      shepherd: yes("Official wrapper"),
      joyride: yes("Native (React-only)"),
    },
  },
  {
    feature: "Vue",
    values: {
      glowtour: yes("Native integration"),
      driver: partial("Compatible, no native adapter"),
      shepherd: yes("Official wrapper"),
      joyride: no(),
    },
  },
  {
    feature: "Angular",
    values: {
      glowtour: yes("Native integration"),
      driver: partial("Compatible, no native adapter"),
      shepherd: yes("Official wrapper"),
      joyride: no(),
    },
  },
  {
    feature: "Solid",
    values: {
      glowtour: yes("Native integration"),
      driver: partial("Compatible, no native adapter"),
      shepherd: partial("Generic JS API"),
      joyride: no(),
    },
  },
  {
    feature: "Framework-agnostic core",
    values: {
      glowtour: yes(),
      driver: yes(),
      shepherd: yes(),
      joyride: no(),
    },
  },
  {
    feature: "TypeScript",
    values: { glowtour: yes(), driver: yes(), shepherd: yes(), joyride: yes() },
  },
  {
    feature: "CSS customization",
    values: { glowtour: yes(), driver: yes(), shepherd: yes(), joyride: yes() },
  },
  {
    feature: "Custom/composable UI",
    values: {
      glowtour: yes("First-class (composable components)"),
      driver: partial("CSS + DOM hooks"),
      shepherd: partial("Step options + CSS classes"),
      joyride: yes("Custom React components"),
    },
  },
  {
    feature: "Custom layouts",
    values: {
      glowtour: yes(),
      driver: partial("Via onPopoverRender"),
      shepherd: partial("Within the step template"),
      joyride: yes("Yes (custom tooltip)"),
    },
  },
  {
    feature: "Chainable builder API",
    values: {
      glowtour: yes("Yes (chainable)"),
      driver: no("No (config object)"),
      shepherd: no("No (imperative addStep)"),
      joyride: no("No (steps prop)"),
    },
  },
  {
    feature: "Accessibility (ARIA, focus, keyboard)",
    values: {
      glowtour: yes(),
      driver: partial("Keyboard + focus trap, open ARIA issues"),
      shepherd: yes(),
      joyride: yes(),
    },
  },
  {
    feature: "License",
    values: {
      glowtour: yes("MIT"),
      driver: yes("MIT"),
      shepherd: partial("AGPL-3.0 or commercial"),
      joyride: yes("MIT"),
    },
  },
];

export const LIBRARY_KEYS: readonly LibraryKey[] = ["glowtour", ...COMPETITOR_KEYS];

/** The rows where the four libraries differ most: the compact table on the home page. */
const FEATURED_FEATURES = new Set([
  "React",
  "Vue",
  "Angular",
  "Framework-agnostic core",
  "Custom/composable UI",
  "Chainable builder API",
  "License",
]);

export const FEATURED_COMPARISON_ROWS = COMPARISON_ROWS.filter((row) =>
  FEATURED_FEATURES.has(row.feature),
);
