import "@glowhop/styles-tour/default.css";
import "@glowhop/vanilla-tour/auto";
import { createDefaultTourElement, createGlowTour } from "@glowhop/vanilla-tour";
import "../src/styles.css";
import { clearPersistedTour, createLogger, persistTour, readPersistedTour } from "./shared";

type View = "dashboard" | "profile";

const logPanel = document.querySelector<HTMLElement>("#log");
if (!logPanel) throw new Error("Missing #log");
const log = createLogger(logPanel);

const tour = createGlowTour({
  onSubscriberError: (error) => log(`onSubscriberError — ${error.message}`),
});
document.body.append(createDefaultTourElement(tour));

// Debug handle so the lab can be driven from the console.
(window as unknown as { __tour: typeof tour }).__tour = tour;
tour.state.subscribe((state) => {
  log(`state — status=${state.status} step=${state.currentStepIndex}`);
});

/* ------------------------------------------------------------------ router */

function currentView(): View {
  return new URLSearchParams(location.search).get("view") === "profile" ? "profile" : "dashboard";
}

function render(view: View): void {
  document.querySelectorAll<HTMLElement>("[data-view]").forEach((section) => {
    section.hidden = section.dataset.view !== view;
  });
  document.querySelectorAll<HTMLElement>("[data-nav]").forEach((button) => {
    button.classList.toggle("bg-slate-900", button.dataset.nav === view);
    button.classList.toggle("text-white", button.dataset.nav === view);
  });
}

function navigate(view: View): void {
  const url = view === "profile" ? `${location.pathname}?view=profile` : location.pathname;
  history.pushState({}, "", url);
  render(view);
}

window.addEventListener("popstate", () => render(currentView()));
document.querySelectorAll<HTMLElement>("[data-nav]").forEach((button) => {
  button.addEventListener("click", () => navigate(button.dataset.nav as View));
});
render(currentView());

/* ------------------------------------------- scenario 1: SPA, zero reload */

const spaWorkflow = tour
  .create("spa-multipage", {
    // animated: false,
    onStart: () => log("SPA tour started"),
    onFinish: () => log("SPA tour finished"),
    onCancel: () => log("SPA tour cancelled"),
  })
  .step({
    target: "#kpi-card",
    title: "Dashboard",
    content: "Step 1 lives on the dashboard view. Advancing triggers a SPA route change.",
  })
  .beforeAdvance(() => {
    log("beforeAdvance — pushState to ?view=profile");
    navigate("profile");
  })
  .step({
    target: "#profile-avatar",
    title: "Profile",
    content: "Step 2 targets an element that only exists after the route change.",
    behavior: { missingTargetStrategy: "wait", targetTimeout: 5000 },
  })
  .beforePrevious(() => {
    log("beforePrevious — pushState back to the dashboard");
    navigate("dashboard");
  })

  .step({
    target: "#profile-save",
    title: "Save",
    content: "Step 3 is on the same view as step 2. Finish to end the tour.",
    behavior: { missingTargetStrategy: "wait", targetTimeout: 5000 },
  })
  .build();

/* ------------------------------ scenario 2: real navigation, full reload */

const reloadWorkflow = tour
  .create("reload-multipage", {
    animated: false,
    onStart: () => log("Full-reload tour started"),
    onFinish: () => log("Full-reload tour finished"),
    onCancel: () => log("Full-reload tour cancelled"),
  })
  .step({
    target: "#kpi-card",
    title: "Dashboard",
    content: "Advancing persists the tour position, then hard-navigates to page B.",
  })
  .beforeAdvance(() => {
    log("beforeAdvance — persisting step 1 and calling location.assign('page-b.html')");
    persistTour({ workflow: "reload-multipage", stepIndex: 1 });
    location.assign("page-b.html");
  })
  .step({
    target: "#settings-panel",
    title: "Settings",
    content: "This target only exists on page B.",
    behavior: { missingTargetStrategy: "wait", targetTimeout: 5000 },
  })
  .build();

/* ----------------------------------------------------------------- wiring */

document.querySelector("#run-spa")?.addEventListener("click", () => {
  navigate("dashboard");
  void tour.run(spaWorkflow);
});

document.querySelector("#run-reload")?.addEventListener("click", () => {
  navigate("dashboard");
  void tour.run(reloadWorkflow);
});

document.querySelector("#clear-log")?.addEventListener("click", () => {
  logPanel.textContent = "";
});

if (readPersistedTour()) {
  log("Found a persisted tour left over from a previous run — clearing it.");
  clearPersistedTour();
}
