import { useState } from "react";
import { examples, pickExamples } from "../lib/examples";

interface ExamplesGalleryProps {
  codeHtml: readonly string[];
  /**
   * Labels of the examples to show, in order. Omit for the whole gallery. `codeHtml` must be
   * pre-rendered in this same order - the page derives both from one list, so they cannot drift.
   */
  labels?: readonly string[];
}

export function ExamplesGallery({ codeHtml, labels }: ExamplesGalleryProps) {
  const shown = labels ? pickExamples(labels) : examples;
  const [activeIndex, setActiveIndex] = useState(0);
  const active = shown[activeIndex];
  const ActiveDemo = active.Demo;

  return (
    <div>
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Examples"
        data-tour="examples-tabs"
      >
        {shown.map((example, index) => (
          <button
            key={example.label}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            onClick={() => setActiveIndex(index)}
            className={`rounded-glow border px-4 py-2 text-sm font-medium transition-colors ${
              index === activeIndex
                ? "border-accent bg-accent text-on-accent"
                : "border-border bg-surface text-text hover:bg-surface-muted"
            }`}
          >
            {example.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-glow border border-border p-6 shadow-glow">
        <h3 className="text-sm font-semibold text-accent">{active.title}</h3>
        <p className="mt-1 text-sm text-text-muted">{active.description}</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="flex min-h-[280px] items-center justify-center rounded-glow bg-surface-muted p-6">
            <ActiveDemo />
          </div>
          <div
            data-code-block
            className="overflow-x-auto rounded-glow border border-border bg-[#101014] text-sm [&_pre]:p-4"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: pre-rendered by Astro's Shiki-backed <Code> component at build time from static demo source strings, not user input.
            dangerouslySetInnerHTML={{ __html: codeHtml[activeIndex] }}
          />
        </div>
      </div>
    </div>
  );
}
