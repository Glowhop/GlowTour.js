import measurements from "../data/bundle-sizes.json";

/**
 * Gzipped sizes of the published packages, as rendered on the site.
 *
 * The numbers come from `scripts/verify-bundles.ts`, which measures the packed tarballs installed
 * as a real consumer would install them - not the workspace source. The file it writes is
 * committed, and CI refreshes it (`test:tarballs`) before it builds this site, so a stale number
 * shows up as an uncommitted change instead of shipping quietly.
 */

export type FrameworkKey = "angular" | "react" | "solid" | "vanilla" | "vue";

/** Keys are scenario names from `bundleScenarios` in scripts/verify-bundles.ts. */
export const ADAPTER_SCENARIO: Record<FrameworkKey, string> = {
  angular: "Angular",
  react: "React",
  solid: "Solid",
  // The /auto entry, not the pure one: registering the custom elements is not optional, so
  // quoting the entry that skips it would understate what a vanilla user actually ships.
  vanilla: "Vanilla /auto",
  vue: "Vue",
};
export const CORE_SCENARIO = "Core index";
export const STYLES_SCENARIO = "Styles CSS";

function gzipBytes(scenario: string): number {
  const value = (measurements as Record<string, number>)[scenario];
  if (typeof value !== "number") {
    // Renaming a scenario breaks the build here rather than rendering a blank cell.
    throw new Error(
      `No measurement for bundle scenario "${scenario}". Run "bun run test:tarballs" to refresh src/data/bundle-sizes.json.`,
    );
  }
  return value;
}

/** One decimal, and always labelled gzipped by the caller: a size without one means nothing. */
export function formatKib(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

export interface FrameworkBundle {
  readonly adapter: number;
  readonly core: number;
  readonly styles: number;
  readonly total: number;
}

export function frameworkBundle(framework: FrameworkKey): FrameworkBundle {
  const adapter = gzipBytes(ADAPTER_SCENARIO[framework]);
  const core = gzipBytes(CORE_SCENARIO);
  const styles = gzipBytes(STYLES_SCENARIO);
  return { adapter, core, styles, total: adapter + core + styles };
}

export const FRAMEWORK_LABELS: Record<FrameworkKey, string> = {
  angular: "Angular",
  react: "React",
  solid: "Solid",
  vanilla: "Vanilla",
  vue: "Vue",
};
