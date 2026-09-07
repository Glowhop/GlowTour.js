import { useState } from "react";
import {
  AdvanceOnClickDemo,
  CancellableDemo,
  ConfirmCancelDemo,
  CustomStyledIndicatorDemo,
  LiveProgressDemo,
  NonInteractiveDemo,
  OverlayClickDemo,
  PlacementOrderDemo,
  WaitForAsyncDemo,
} from "./HeroDemos";

interface Example {
  label: string;
  title: string;
  description: string;
  Demo: () => JSX.Element;
}

const examples: Example[] = [
  {
    label: "Simple walkthrough",
    title: "Simple walkthrough",
    description: "A plain, 3-step walkthrough — no special options, just steps.",
    Demo: NonInteractiveDemo,
  },
  {
    label: "Click to continue",
    title: "Click to continue",
    description: "onTargetEvent('click', ...) advances the tour from a real click on the target.",
    Demo: AdvanceOnClickDemo,
  },
  {
    label: "Popover placement",
    title: "Popover placement",
    description:
      "Four steps, each pinning a single popover.placementTryOrder — top, bottom, left, right.",
    Demo: PlacementOrderDemo,
  },
  {
    label: "Wait for data",
    title: "Wait for data",
    description: "waitUntilElement(selector) holds the tour until a late-arriving element exists.",
    Demo: WaitForAsyncDemo,
  },
  {
    label: "Can't be skipped",
    title: "Can't be skipped",
    description: "cancellable: false locks a tour so Escape and Cancel can't skip it.",
    Demo: CancellableDemo,
  },
  {
    label: "Confirm before leaving",
    title: "Confirm before leaving",
    description: "onCancel opens window.confirm() and calls context.abort() to keep the tour open.",
    Demo: ConfirmCancelDemo,
  },
  {
    label: "Click outside to continue",
    title: "Click outside to continue",
    description: "behavior.overlayClick controls what a click on the dimmed backdrop does.",
    Demo: OverlayClickDemo,
  },
  {
    label: "Custom look",
    title: "Custom look",
    description:
      "overlay/popover overrides and a custom <Pointer> glyph, composed directly with Root/Overlay/Popover.",
    Demo: CustomStyledIndicatorDemo,
  },
  {
    label: "Live step counter",
    title: "Live step counter",
    description: "A custom popover subcomponent reads useTour() to show real step progress.",
    Demo: LiveProgressDemo,
  },
];

interface ExamplesGalleryProps {
  codeHtml: readonly string[];
}

export function ExamplesGallery({ codeHtml }: ExamplesGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = examples[activeIndex];
  const ActiveDemo = active.Demo;

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Examples">
        {examples.map((example, index) => (
          <button
            key={example.label}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            onClick={() => setActiveIndex(index)}
            className={`rounded-[var(--radius-glow)] border px-4 py-2 text-sm font-medium transition-colors ${
              index === activeIndex
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
            }`}
          >
            {example.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-[var(--radius-glow)] border border-[var(--color-border)] p-6 shadow-[var(--shadow-glow)]">
        <h3 className="text-sm font-semibold text-[var(--color-accent)]">{active.title}</h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{active.description}</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="flex min-h-[280px] items-center justify-center rounded-[var(--radius-glow)] bg-[var(--color-surface-muted)] p-6">
            <ActiveDemo />
          </div>
          <div
            data-code-block
            className="overflow-x-auto rounded-[var(--radius-glow)] border border-[var(--color-border)] bg-[#101014] text-sm [&_pre]:p-4"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: pre-rendered by Astro's Shiki-backed <Code> component at build time from static demo source strings, not user input.
            dangerouslySetInnerHTML={{ __html: codeHtml[activeIndex] }}
          />
        </div>
      </div>
    </div>
  );
}
