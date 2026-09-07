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
 * The same two-step workflow as page A. Step 0 targets `#kpi-card`, which does
 * not exist in this document — resuming has to get past it somehow.
 *
 * `strategy` decides what the engine does with that missing target: the default
 * `"error"` kills the tour, `"skip"` walks past the consumed step.
 */
function buildWorkflowOn(instance: ReturnType<typeof createGlowTour>, strategy: "error" | "skip") {
  return instance
    .create("reload-multipage", {
      animated: false,
      onStart: () => log(`onStart (${strategy})`),
      onFinish: () => log(`onFinish (${strategy})`),
      onCancel: () => log(`onCancel (${strategy})`),
    })
    .step({
      target: "#kpi-card",
      title: "Dashboard",
      content: "Step 1 — target lives on page A only.",
      behavior: { missingTargetStrategy: strategy, targetTimeout: 500 },
    })
    .beforeAdvance(() => log("step 1 beforeAdvance — should NOT run on resume"))
    .step({
      target: "#settings-panel",
      title: "Settings",
      content: "Step 2 — this is where the tour should resume.",
      behavior: { missingTargetStrategy: "wait", targetTimeout: 5000 },
    })
    .build();
}

function snapshot(): string {
  const state = tour.state.get();
  return `status=${state.status} step=${state.currentStepIndex}`;
}

/** What the current API offers: run() then goToStep(). */
async function attemptRunThenGoToStep(stepIndex: number): Promise<void> {
  log("--- Attempt 1: run() + goToStep() ---");
  try {
    await tour.run(buildWorkflowOn(tour, "error"));
    log("run() resolved.");
  } catch (error) {
    log(`run() threw — ${(error as Error).message}`);
  }
  log(`before goToStep: ${snapshot()}`);
  try {
    await tour.goToStep(stepIndex);
    log(`goToStep(${stepIndex}) resolved.`);
  } catch (error) {
    log(`goToStep() threw — ${(error as Error).message}`);
  }
  log(`after goToStep: ${snapshot()}`);
}

/** The only workaround available today: make consumed steps skippable. */
async function attemptSkipPrefix(): Promise<void> {
  log("--- Attempt 2: missingTargetStrategy 'skip' on consumed steps ---");
  tour.dispose();
  const resumed = createGlowTour();
  document.body.append(createDefaultTourElement(resumed));
  try {
    await resumed.run(buildWorkflowOn(resumed, "skip"));
    const state = resumed.state.get();
    log(`skip-prefix result: status=${state.status} step=${state.currentStepIndex}`);
  } catch (error) {
    log(`skip-prefix threw — ${(error as Error).message}`);
  }
}

async function main(): Promise<void> {
  const persisted = readPersistedTour();
  if (!persisted) {
    log("No persisted tour found. Start scenario 2 from page A.");
    return;
  }
  clearPersistedTour();
  log(`Persisted tour: ${persisted.workflow} @ step ${persisted.stepIndex}`);
  await attemptRunThenGoToStep(persisted.stepIndex);
  await attemptSkipPrefix();
}

void main();
