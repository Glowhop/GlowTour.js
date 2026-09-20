import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { type Example, examples, pickExamples } from "../lib/examples";

interface ExamplesGalleryProps {
  codeHtml: readonly string[];
  /**
   * Labels of the examples to show, in order. Omit for the whole gallery. `codeHtml` must be
   * pre-rendered in this same order - the page derives both from one list, so they cannot drift.
   */
  labels?: readonly string[];
}

/**
 * Up to this many examples, the tabs fit on a single line and switching stays one click away.
 * Past it - the full gallery is thirteen - the row wraps onto three lines and pushes the demo
 * it is selecting below the fold, so the gallery switches to a one-line picker instead.
 */
const INLINE_TAB_LIMIT = 5;

interface SelectorProps {
  readonly shown: readonly Example[];
  readonly activeIndex: number;
  readonly onSelect: (index: number) => void;
}

/** The whole set as a wrapping row of tabs, for a gallery short enough to fit on one line. */
function ExampleTabs({ shown, activeIndex, onSelect }: SelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Examples">
      {shown.map((example, index) => (
        <button
          key={example.label}
          type="button"
          role="tab"
          aria-selected={index === activeIndex}
          onClick={() => onSelect(index)}
          className={`inline-flex items-center gap-2 rounded-glow border px-4 py-2 text-sm font-medium transition-colors ${
            index === activeIndex
              ? "border-accent bg-accent text-on-accent"
              : "border-border bg-surface text-text hover:bg-surface-muted"
          }`}
        >
          <example.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {example.label}
        </button>
      ))}
    </div>
  );
}

/**
 * One line: the current example, a drop-down listing all of them with their descriptions, and
 * a pair of arrows to walk the gallery without opening anything.
 */
function ExamplePicker({ shown, activeIndex, onSelect }: SelectorProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(activeIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;
  const active = shown[activeIndex];

  // Pointer, rather than click: a press outside should dismiss the list before that press lands
  // on whatever is underneath, the same way a native select behaves.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // The list takes focus when it opens, so the arrow keys move through the options rather than
  // scrolling the page, and the highlight starts on the example currently being shown.
  useEffect(() => {
    if (!open) return;
    setHighlightedIndex(activeIndex);
    listRef.current?.focus();
  }, [open, activeIndex]);

  // Keeps the keyboard highlight inside the scrolling list.
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listboxId}-option-${highlightedIndex}`)?.scrollIntoView({
      block: "nearest",
    });
  }, [open, highlightedIndex, listboxId]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function select(index: number) {
    onSelect(index);
    close();
  }

  function onListKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const lastIndex = shown.length - 1;
    const move = (index: number) => {
      event.preventDefault();
      setHighlightedIndex(index);
    };
    switch (event.key) {
      case "ArrowDown":
        return move(Math.min(highlightedIndex + 1, lastIndex));
      case "ArrowUp":
        return move(Math.max(highlightedIndex - 1, 0));
      case "Home":
        return move(0);
      case "End":
        return move(lastIndex);
      case "Enter":
      case " ":
        event.preventDefault();
        return select(highlightedIndex);
      case "Escape":
        event.preventDefault();
        return close();
      case "Tab":
        return setOpen(false);
    }
  }

  const arrowClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-glow border border-border bg-surface text-text transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface";

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={`Example: ${active.label}. Choose another`}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-glow border border-accent bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-opacity hover:opacity-90 sm:flex-none"
      >
        <active.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{active.label}</span>
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 transition-transform sm:ml-1 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden text-sm tabular-nums text-text-muted sm:inline">
          {activeIndex + 1} of {shown.length}
        </span>
        <button
          type="button"
          className={arrowClass}
          disabled={activeIndex === 0}
          onClick={() => onSelect(activeIndex - 1)}
          aria-label="Previous example"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={arrowClass}
          disabled={activeIndex === shown.length - 1}
          onClick={() => onSelect(activeIndex + 1)}
          aria-label="Next example"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label="Examples"
          aria-activedescendant={optionId(highlightedIndex)}
          onKeyDown={onListKeyDown}
          className="absolute top-full right-0 left-0 z-30 mt-2 grid max-h-[min(60vh,26rem)] grid-cols-1 gap-1 overflow-y-auto rounded-glow border border-border bg-surface p-2 shadow-glow outline-none sm:grid-cols-2 lg:grid-cols-3"
        >
          {shown.map((example, index) => (
            // A real button, so a pointer press behaves like one; focus stays on the list itself,
            // which is what `aria-activedescendant` above announces as the moving highlight.
            <button
              key={example.label}
              id={optionId(index)}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={index === activeIndex}
              onClick={() => select(index)}
              onMouseMove={() => setHighlightedIndex(index)}
              className={`rounded-glow border px-3 py-2 text-left transition-colors ${
                index === activeIndex
                  ? "border-accent bg-accent/10"
                  : index === highlightedIndex
                    ? "border-border bg-surface-muted"
                    : "border-transparent"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-text">
                <example.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {example.label}
              </span>
              <span className="mt-1 block text-xs text-text-muted">{example.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExamplesGallery({ codeHtml, labels }: ExamplesGalleryProps) {
  const shown = labels ? pickExamples(labels) : examples;
  const [activeIndex, setActiveIndex] = useState(0);
  const active = shown[activeIndex];
  const ActiveDemo = active.Demo;

  return (
    <div>
      <div data-tour="examples-tabs">
        {shown.length > INLINE_TAB_LIMIT ? (
          <ExamplePicker shown={shown} activeIndex={activeIndex} onSelect={setActiveIndex} />
        ) : (
          <ExampleTabs shown={shown} activeIndex={activeIndex} onSelect={setActiveIndex} />
        )}
      </div>

      <div className="mt-6">
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
