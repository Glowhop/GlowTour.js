import { navigate } from "astro:transitions/client";
import type { Tour, WorkflowDefinition } from "@glowhop/vanilla-tour";

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
  missingTargetStrategy: "wait",
  targetTimeout: 10_000,
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

/** Notes where the tour resumes, then hands the navigation to the client router. */
function goTo(stepId: string, path: string): () => Promise<void> {
  return async () => {
    pendingStep = stepId;
    await navigate(path);
  };
}

export function buildSiteTourWorkflow(tour: Tour): WorkflowDefinition {
  return tour
    .create(SITE_TOUR_NAME)
    .step({
      content:
        "You are in one right now. Everything you see for the next few steps is the same library this page documents, running against this page.",
      id: "welcome",
      popover: { placementTryOrder: ["bottom", "top"] },
      target: '[data-tour="hero"]',
      title: "This is a guided tour",
    })
    .step({
      content:
        "Two packages: the adapter for your framework and the default theme. Pick a framework here and the command follows.",
      id: "install",
      popover: { placementTryOrder: ["bottom", "top"] },
      target: '[data-tour="install"]',
      title: "Two packages, one line",
    })
    .step({
      // The page stays usable under the overlay, which is the point of the step: switching tabs
      // while a step is open is the behavior being described.
      behavior: { allowInteraction: true },
      content:
        "Switch tabs while this step is open - behavior.allowInteraction lets clicks through the overlay to the target. Each example runs for real, next to the code that produced it.",
      id: "examples",
      popover: { placementTryOrder: ["bottom", "top"] },
      target: '[data-tour="examples-tabs"]',
      title: "You can still use the page",
    })
    .step({
      content:
        "React, Vue, Solid, Angular and vanilla DOM each get a native adapter over one shared engine. The tour you are in uses the vanilla one, because this page is static HTML. Next stop: the React page.",
      id: "frameworks",
      popover: { placementTryOrder: ["top", "bottom"] },
      target: '[data-tour="frameworks"]',
      title: "Five adapters, one engine",
    })
    .beforeAdvance(goTo("adapter-install", "/react"))
    .step({
      behavior: acrossPageBoundary,
      content:
        "That was a client-side navigation, not a reload. The page was swapped underneath, and the tour picked itself back up here, on a target that only exists on this page.",
      id: "adapter-install",
      popover: { placementTryOrder: ["bottom", "top"] },
      target: '[data-tour="framework-install"]',
      title: "A different page, the same tour",
    })
    .beforePrevious(goTo("frameworks", "/"))
    .step({
      content:
        "Build a workflow, render the tour, run it. This snippet comes straight from the examples directory of the repository - copy, paste, run.",
      id: "adapter-quickstart",
      popover: { placementTryOrder: ["left", "top", "bottom"] },
      target: '[data-tour="framework-quickstart"]',
      title: "Your first tour, in one file",
    })
    .beforeAdvance(goTo("gallery", "/examples"))
    .step({
      behavior: acrossPageBoundary,
      content:
        "Placement, waiting on async data, tours that cannot be skipped, custom themes - every one of them runs on this page, beside its source.",
      id: "gallery",
      popover: { placementTryOrder: ["bottom", "top"] },
      target: '[data-tour="examples-tabs"]',
      title: "The whole gallery",
    })
    .beforePrevious(goTo("adapter-quickstart", "/react"))
    .step({
      content:
        "That is the tour. It was about sixty lines of workflow. The documentation covers the rest: placement, scrolling, lifecycle hooks, accessibility, and SSR.",
      id: "docs",
      popover: { placementTryOrder: ["bottom", "left"] },
      target: '[data-tour="docs-cta"]',
      title: "Now go and build one",
      behavior: { allowInteraction: true },
    })
    .build();
}
