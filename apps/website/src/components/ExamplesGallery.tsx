import { useState } from "react";
import {
  AdvanceOnClickDemo,
  CancellableDemo,
  CustomIndicatorDemo,
  CustomStylingDemo,
  InteractionAllowedDemo,
  MultiStepDemo,
  ProgrammaticDemo,
  SingleStepDemo,
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
    label: "Single step",
    title: "Single step",
    description: "The minimal builder: one target, one popover.",
    Demo: SingleStepDemo,
  },
  {
    label: "Placement fallback",
    title: "Placement fallback",
    description:
      "A multi-step tour using popover.placementTryOrder to walk placements until one fits.",
    Demo: MultiStepDemo,
  },
  {
    label: "Programmatic",
    title: "Programmatic",
    description:
      ".do() and .wait() sequence work between steps; onStart/onFinish observe the whole run.",
    Demo: ProgrammaticDemo,
  },
  {
    label: "Interaction allowed",
    title: "Interaction allowed",
    description: "behavior.allowInteraction keeps the target clickable through the overlay.",
    Demo: InteractionAllowedDemo,
  },
  {
    label: "Advance on click",
    title: "Advance on click",
    description: "onTargetEvent('click', ...) advances the tour from a real click on the target.",
    Demo: AdvanceOnClickDemo,
  },
  {
    label: "Cancellable",
    title: "Cancellable",
    description: "cancellable: false locks a step so Escape and Cancel can't skip it.",
    Demo: CancellableDemo,
  },
  {
    label: "Custom styling",
    title: "Custom styling",
    description: "overlay and popover options are real per-workflow overrides, not just theme CSS.",
    Demo: CustomStylingDemo,
  },
  {
    label: "Wait for async content",
    title: "Wait for async content",
    description: "waitUntilElement(selector) holds the tour until a late-arriving element exists.",
    Demo: WaitForAsyncDemo,
  },
  {
    label: "Custom indicator",
    title: "Custom indicator",
    description: "Compose Root/Overlay/Pointer/Popover directly to swap the pointer's own content.",
    Demo: CustomIndicatorDemo,
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
            {index + 1}. {example.label}
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
