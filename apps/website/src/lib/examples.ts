import {
  AdvanceOnClickDemo,
  CancellableDemo,
  ConfirmCancelDemo,
  CustomStyledIndicatorDemo,
  CustomThemeDemo,
  LiveProgressDemo,
  LongContentDemo,
  NonInteractiveDemo,
  OverlayClickDemo,
  PlacementOrderDemo,
  ThemeDemo,
  WaitForAsyncDemo,
} from "../components/HeroDemos";
import {
  advanceOnClickSource,
  cancellableSource,
  confirmCancelSource,
  customStyledIndicatorSource,
  customThemeSource,
  liveProgressSource,
  longContentSource,
  nonInteractiveSource,
  overlayClickSource,
  placementOrderSource,
  themeSource,
  waitForAsyncSource,
} from "./hero-demo-sources";

/**
 * The examples gallery. Demo and source live in the same entry on purpose: they used to
 * be two arrays kept in the same order by hand, which silently pairs the wrong snippet
 * with a demo the moment one of them is reordered.
 */
export interface Example {
  /** Tab label. */
  readonly label: string;
  /** Heading shown above the running demo. */
  readonly title: string;
  /** One line on what the example demonstrates. */
  readonly description: string;
  /** The live demo component. */
  readonly Demo: () => JSX.Element;
  /** The snippet shown next to it, highlighted at build time. */
  readonly source: string;
}

export const examples: readonly Example[] = [
  {
    Demo: NonInteractiveDemo,
    description: "A plain, 3-step walkthrough — no special options, just steps.",
    label: "Simple walkthrough",
    source: nonInteractiveSource,
    title: "Simple walkthrough",
  },
  {
    Demo: AdvanceOnClickDemo,
    description: "onTargetEvent('click', ...) advances the tour from a real click on the target.",
    label: "Click to continue",
    source: advanceOnClickSource,
    title: "Click to continue",
  },
  {
    Demo: PlacementOrderDemo,
    description:
      "Four steps, each pinning a single popover.placementTryOrder — top, bottom, left, right.",
    label: "Popover placement",
    source: placementOrderSource,
    title: "Popover placement",
  },
  {
    Demo: ThemeDemo,
    description:
      "The default theme ships light and dark; data-glow-tour-theme on a wrapper pins one.",
    label: "Light and dark",
    source: themeSource,
    title: "Light and dark",
  },
  {
    Demo: LongContentDemo,
    description:
      "A long step in a narrow popover: the content scrolls, the footer buttons stay put.",
    label: "Long content",
    source: longContentSource,
    title: "Long content",
  },
  {
    Demo: WaitForAsyncDemo,
    description: "waitUntilElement(selector) holds the tour until a late-arriving element exists.",
    label: "Wait for data",
    source: waitForAsyncSource,
    title: "Wait for data",
  },
  {
    Demo: CancellableDemo,
    description: "cancellable: false locks a tour so Escape and Cancel can't skip it.",
    label: "Can't be skipped",
    source: cancellableSource,
    title: "Can't be skipped",
  },
  {
    Demo: ConfirmCancelDemo,
    description: "onCancel opens window.confirm() and calls context.abort() to keep the tour open.",
    label: "Confirm before leaving",
    source: confirmCancelSource,
    title: "Confirm before leaving",
  },
  {
    Demo: OverlayClickDemo,
    description: "behavior.overlayClick controls what a click on the dimmed backdrop does.",
    label: "Click outside to continue",
    source: overlayClickSource,
    title: "Click outside to continue",
  },
  {
    Demo: CustomStyledIndicatorDemo,
    description:
      "overlay/popover overrides and a custom <Pointer> glyph, composed directly with Root/Overlay/Popover.",
    label: "Custom look",
    source: customStyledIndicatorSource,
    title: "Custom look",
  },
  {
    Demo: CustomThemeDemo,
    description:
      "The same DefaultTour, re-skinned entirely from CSS: --glow-tour-* tokens and an inherited font.",
    label: "Custom theme",
    source: customThemeSource,
    title: "Custom theme",
  },
  {
    Demo: LiveProgressDemo,
    description: "A custom popover subcomponent reads useTour() to show real step progress.",
    label: "Live step counter",
    source: liveProgressSource,
    title: "Live step counter",
  },
];

/**
 * Resolves example labels to entries, in the order given. The gallery island cannot receive
 * `Example` objects as props — they hold component references, and Astro serializes island props
 * to JSON — so a page picks a subset by label and the island looks it up on this side.
 */
export function pickExamples(labels: readonly string[]): readonly Example[] {
  return labels.map((label) => {
    const example = examples.find((candidate) => candidate.label === label);
    if (!example) throw new Error(`Unknown example label: ${label}`);
    return example;
  });
}

/** The subset shown on the home page; the full gallery lives on /examples. */
export const FEATURED_EXAMPLE_LABELS = [
  "Simple walkthrough",
  "Click to continue",
  "Light and dark",
] as const;
