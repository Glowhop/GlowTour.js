import "@glowhop/styles-tour/default.css";
import "@glowhop/vanilla-tour/auto";
import { createDefaultTourElement, createGlowTour } from "@glowhop/vanilla-tour";
import "../src/styles.css";
import { clearPersistedTour, createLogger, readPersistedTour } from "./shared";

const logPanel = document.querySelector<HTMLElement>("#log");
if (!logPanel) throw new Error("Missing #log");
const log = createLogger(logPanel);

const tour = createGlowTour({
  onSubscriberError: (error) => log(`onSubscriberError — ${error.message}`),
});
document.body.append(createDefaultTourElement(tour));
(window as unknown as { __tour: typeof tour }).__tour = tour;

/**
 * The same workflow as page A, rebuilt from code.
 *
 * Rebuilding is not a workaround: a step's callbacks (`beforeAdvance`, actions,
 * event handlers) cannot be serialized, so what crosses the page boundary is
 * only a step id. The workflow itself always comes from the app's own code.
 */
const workflow = tour
  .create("reload-multipage", {
    // animated: false,
    onStart: ({ step }) => log(`onStart — resumed on "${step?.id}"`),
    onFinish: () => log("onFinish"),
    onCancel: () => log("onCancel"),
  })
  .step({
    id: "reload-dashboard",
    target: "#kpi-card",
    title: "Dashboard",
    content: "Step 1 — target lives on page A only. Never entered when resuming.",
  })
  .beforeAdvance(() => log("step 1 beforeAdvance — does NOT run on resume"))
  .step({
    id: "reload-settings",
    target: "#settings-panel",
    title: "Settings",
    content: "Step 2 — this is where the tour resumes.",
    behavior: { missingTargetStrategy: "wait", targetTimeout: 5000 },
  })
  .build();

async function main(): Promise<void> {
  const persisted = readPersistedTour();
  if (!persisted) {
    log("No persisted tour found. Start scenario 2 from page A.");
    return;
  }
  clearPersistedTour();
  log(`Persisted tour: ${persisted.workflow} @ "${persisted.stepId}"`);

  // The whole resume: one option. No goToStep(), no skippable prefix steps.
  try {
    await tour.run(workflow, { startAt: persisted.stepId });
    const state = tour.state.get();
    log(`resumed: status=${state.status} step=${state.currentStep?.id}`);
  } catch (error) {
    // A stale id (the workflow changed since the snapshot was written) surfaces
    // here instead of silently restarting the tour from the beginning.
    log(`resume failed — ${(error as Error).message}`);
  }
}

void main();
