import { navigate } from "astro:transitions/client";
import type { Tour, WorkflowDefinition } from "@glowhop/vanilla-tour";
import { FRAMEWORK_LOGOS, type SiteTourFramework } from "./site-tour-icons";

/**
 * The tour of this site, running on this site.
 *
 * It crosses three pages (`/`, `/react`, `/examples`) through Astro's ClientRouter, so the page
 * change is a client-side swap rather than a reload. The presentation does not survive that swap -
 * the swap takes the elements the tour renders into, which returns the controller to idle - so a
 * boundary step notes where to pick up and hands the router the navigation, and the arriving page
 * re-enters the same workflow at that step. That is the `startAt` recipe from
 * docs/guides/resuming, with a module variable in place of sessionStorage: the document is never
 * replaced, so nothing has to be serialized.
 *
 * Step order follows the page from top to bottom, so the tour never scrolls backwards through a
 * page it has already walked down.
 *
 * Targets are `data-tour` attributes placed explicitly on the elements being visited, never
 * Tailwind classes or ids that describe something else: restyling the site must not break the
 * tour.
 */

export const SITE_TOUR_NAME = "site-tour";

/** Query parameter that starts the tour from the top, so the tour can be linked to. */
export const TOUR_QUERY_PARAM = "tour";

/**
 * Applied to the first step after each page boundary: the tour is re-entered from
 * `astro:page-load`, so the target is normally in the DOM already, and waiting covers the case
 * where the arriving page's own scripts have not finished putting it there.
 */
const acrossPageBoundary = {
  missingTarget: { strategy: "wait", timeout: 10_000 },
} as const;

/**
 * Where to pick the tour up on the page currently being navigated to.
 *
 * A module variable rather than sessionStorage, because the client router never replaces the
 * document: nothing has to survive a reload, so nothing has to be serialized.
 */
let pendingStep: string | null = null;

/** Reads and clears the step the last navigation was heading for. */
export function takePendingStep(): string | null {
  const step = pendingStep;
  pendingStep = null;
  return step;
}

/**
 * A `beforeLeave` hook that, when the tour leaves the step in `direction`, notes where the tour
 * resumes, then hands the navigation to the client router. Leaving in the other direction stays on
 * the current page.
 */
function goTo(
  direction: "advance" | "previous",
  stepId: string,
  path: string,
): (context: { readonly direction: "advance" | "previous" }) => Promise<void> {
  return async (context) => {
    if (context.direction !== direction) return;
    pendingStep = stepId;
    await navigate(path);
  };
}

/**
 * The greeting shown by the first step. No title: the image is the whole message, and its
 * alternative text gives the popover its accessible name.
 */
function welcomeImage(): HTMLImageElement {
  const image = document.createElement("img");
  image.src = "/mascot-welcome-no-feet.png";
  image.alt = "Welcome! A wizard bunny waves hello before the tour of GlowTour.js begins.";
  // The intrinsic size reserves the box before the file loads, so the popover is centered on its
  // final height instead of growing under the user once the image arrives.
  image.width = 1218;
  image.height = 1292;
  image.decoding = "async";
  image.style.cssText = "display:block;width:100%;height:auto;max-height:50vh;object-fit:contain";
  return image;
}

/** A decorative emoji: hidden from assistive technology, so titles and content read as plain text. */
function emoji(symbol: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.setAttribute("aria-hidden", "true");
  span.textContent = symbol;
  return span;
}

/** Creates an element with Tailwind classes and children. */
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.append(...children);
  return node;
}

/** A step title led by an emoji or a logo. */
function title(icon: string | Node, text: string): HTMLSpanElement {
  return element(
    "span",
    "inline-flex items-center gap-2",
    typeof icon === "string" ? emoji(icon) : icon,
    text,
  );
}

/** A framework logo, decorative: the framework's name is always written next to it. */
function logo(framework: SiteTourFramework, size = "h-4 w-4"): SVGSVGElement {
  const { body, viewBox } = FRAMEWORK_LOGOS[framework];
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", `${size} shrink-0`);
  svg.innerHTML = body;
  return svg;
}

const MUTED_SURFACE = "bg-(--glow-tour-color-surface-muted)";

/** A keyboard key. */
function kbd(label: string): HTMLElement {
  return element(
    "kbd",
    `inline-flex min-w-6 items-center justify-center rounded-md border border-b-2 border-(--glow-tour-color-border) ${MUTED_SURFACE} px-1.5 py-0.5 font-mono text-xs`,
    label,
  );
}

function code(text: string): HTMLElement {
  return element("code", `rounded-md ${MUTED_SURFACE} px-1.5 py-0.5 font-mono text-[0.85em]`, text);
}

/** A tinted aside with a leading emoji, for a tip the reader can act on right away. */
function callout(symbol: string, ...children: (Node | string)[]): HTMLElement {
  return element(
    "p",
    "m-0 flex items-start gap-2 rounded-lg border-l-4 border-(--glow-tour-color-accent) bg-(--glow-tour-color-accent)/10 px-3 py-2 text-sm",
    emoji(symbol),
    element("span", "", ...children),
  );
}

/**
 * Small cards with a large emoji, two per row. Tighter on narrow screens, where every pixel of
 * popover height is taken from the target.
 */
function cards(...items: readonly (readonly [symbol: string, label: string])[]): HTMLUListElement {
  return element(
    "ul",
    "m-0 grid list-none grid-cols-2 gap-1 p-0 sm:gap-1.5",
    ...items.map(([symbol, label]) =>
      element(
        "li",
        "flex items-center gap-1.5 rounded-lg border border-(--glow-tour-color-border) px-2 py-1 text-xs sm:gap-2 sm:px-2.5 sm:py-2 sm:text-sm",
        element("span", "text-base leading-none sm:text-xl", emoji(symbol)),
        label,
      ),
    ),
  );
}

/** A few labelled pills, led by an emoji or a logo, as a list so screen readers announce how many there are. */
function pills(
  ...items: readonly (readonly [icon: string | Node, label: string])[]
): HTMLUListElement {
  return element(
    "ul",
    "m-0 flex list-none flex-wrap gap-1.5 p-0",
    ...items.map(([icon, label]) =>
      element(
        "li",
        `inline-flex items-center gap-1.5 rounded-full border border-(--glow-tour-color-border) ${MUTED_SURFACE} px-2.5 py-1 text-xs font-medium`,
        typeof icon === "string" ? emoji(icon) : icon,
        label,
      ),
    ),
  );
}

/** Step content: paragraphs and rows stacked with even spacing. */
function content(...children: (Node | string)[]): HTMLDivElement {
  return element(
    "div",
    "flex flex-col gap-3",
    ...children.map((child) => (typeof child === "string" ? element("p", "m-0", child) : child)),
  );
}

export function buildSiteTourWorkflow(tour: Tour): WorkflowDefinition {
  return tour
    .create(SITE_TOUR_NAME)
    .step({
      // Nothing on the page to point at yet: resolving to nothing lets the "detached" strategy
      // show the greeting centered, over a backdrop that covers the whole page.
      classNames: {
        popover: "block",
      },
      behavior: { missingTarget: { strategy: "detached" } },
      content: welcomeImage(),
      id: "intro",
      target: () => null,
    })
    .step({
      content: content(
        "You are in one right now. Everything you see for the next few steps is the same library this page documents, running against this page.",
        element(
          "p",
          "m-0 flex flex-wrap items-center gap-1.5 text-sm",
          kbd("←"),
          kbd("→"),
          "to move,",
          kbd("Esc"),
          "to leave.",
        ),
      ),
      id: "welcome",
      popover: { placementTryOrder: ["bottom", "top"] },
      target: '[data-tour="hero"]',
      title: title("👋", "This is a guided tour"),
    })
    .step({
      content: content(
        element(
          "ul",
          "m-0 flex list-none flex-col gap-1.5 p-0",
          element(
            "li",
            "flex items-center gap-2",
            emoji("🧩"),
            code("@glowhop/react-tour"),
            "the adapter",
          ),
          element(
            "li",
            "flex items-center gap-2",
            emoji("🎨"),
            code("@glowhop/styles-tour"),
            "the default theme",
          ),
        ),
        "Pick a framework here and the command follows.",
      ),
      id: "install",
      popover: { placementTryOrder: ["bottom", "top"] },
      target: '[data-tour="install"]',
      title: "Two packages, one line",
    })
    .step({
      // The page stays usable under the overlay, which is the point of the step: switching tabs
      // while a step is open is the behavior being described.
      behavior: { allowInteraction: true },
      content: content(
        callout("💡", "Try it: switch tabs while this step is open."),
        element(
          "p",
          "m-0",
          code("behavior.allowInteraction"),
          " lets clicks through the overlay to the target. Each example runs for real, next to the code that produced it.",
        ),
      ),
      id: "examples",
      popover: { placementTryOrder: ["bottom", "top"] },
      target: '[data-tour="examples-tabs"]',
      title: "You can still use the page",
    })
    .step({
      content: content(
        "Each framework gets a native adapter over one shared engine.",
        "The tour you are in uses the vanilla one, because this page is static HTML. Next stop: the React page 👉",
      ),
      id: "frameworks",
      popover: { placementTryOrder: ["top", "bottom"] },
      target: '[data-tour="frameworks"]',
      title: title("⚙️", "Five adapters, one engine"),
    })
    .beforeLeave(goTo("advance", "adapter-install", "/react"))
    .step({
      behavior: acrossPageBoundary,
      content: content(
        element(
          "p",
          `m-0 flex items-center justify-center gap-2 rounded-lg ${MUTED_SURFACE} px-3 py-2 font-mono text-xs`,
          element("span", "inline-flex items-center gap-1", emoji("🏠"), "/"),
          element("span", "text-(--glow-tour-color-accent)", emoji("➜")),
          element("span", "inline-flex items-center gap-1", logo("react"), "/react"),
        ),
        "That was a client-side navigation, not a reload ⚡ The page was swapped underneath, and the tour picked itself back up here, on a target that only exists on this page.",
      ),
      id: "adapter-install",
      popover: { placementTryOrder: ["bottom", "top"] },
      target: '[data-tour="framework-install"]',
      title: title(logo("react", "h-5 w-5"), "A different page, the same tour"),
    })
    .beforeLeave(goTo("previous", "frameworks", "/"))
    .step({
      content: content(
        element(
          "ol",
          "m-0 flex list-none flex-col gap-1.5 p-0",
          element("li", "flex items-center gap-2", emoji("1️⃣"), "Build a workflow"),
          element("li", "flex items-center gap-2", emoji("2️⃣"), "Render the tour"),
          element("li", "flex items-center gap-2", emoji("3️⃣"), "Run it"),
        ),
        "This snippet comes straight from the examples directory of the repository - copy, paste, run.",
      ),
      id: "adapter-quickstart",
      popover: { placementTryOrder: ["left", "top", "bottom"] },
      target: '[data-tour="framework-quickstart"]',
      title: title("🚀", "Your first tour, in one file"),
    })
    .beforeLeave(goTo("advance", "gallery", "/examples"))
    .step({
      behavior: acrossPageBoundary,
      content: content(
        "Every one of these runs on this page, beside its source:",
        cards(
          ["📍", "Placement"],
          ["⏳", "Async data"],
          ["🔒", "Unskippable"],
          ["🎨", "Custom themes"],
        ),
      ),
      id: "gallery",
      popover: { placementTryOrder: ["bottom", "top"] },
      target: '[data-tour="examples-tabs"]',
      title: title("🖼️", "The whole gallery"),
    })
    .beforeLeave(goTo("previous", "adapter-quickstart", "/react"))
    .step({
      content: content(
        "It was about sixty lines of workflow. The documentation covers the rest:",
        pills(
          ["📐", "Placement"],
          ["🪝", "Lifecycle hooks"],
          ["♿", "Accessibility"],
          ["🖥️", "SSR"],
        ),
      ),
      id: "docs",
      popover: { placementTryOrder: ["bottom", "left"] },
      target: '[data-tour="docs-cta"]',
      title: title("🎉", "Now go and build one"),
      behavior: { allowInteraction: true },
    })
    .build();
}
