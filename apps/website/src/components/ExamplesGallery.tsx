import { useState } from "react";
import { examples } from "../lib/examples";

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
