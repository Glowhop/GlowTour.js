import { GlowTour, useGlowTour, useGlowTourContext } from "@glowhop/react-tour";
import "@glowhop/styles-tour/default.css";
import { StrictMode, useRef } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles.css";
import "../src/theme";
import "../src/tutorial.css";

function Tutorial() {
  const saveButton = useRef<HTMLButtonElement>(null);
  const core = useGlowTour();

  function startTutorial() {
    const workflow = core
      .create("react-use-glow-tour")
      .step({
        id: "profile",
        target: '[data-tour="profile"]',
        title: "Your profile",
        content: "This step targets a data-tour attribute.",
      })
      .step({
        id: "save",
        target: () => saveButton.current,
        title: "Save",
        content: "This step targets a React ref through a function.",
      })
      .step({
        id: "help",
        target: '[data-tour="help"]',
        title: "Help",
        content: "The status bar above updates from useGlowTour, outside the tour root.",
      })
      .build();
    void core.start(workflow, {});
  }

  console.log("core", core);

  return (
    <main className="tutorial">
      <h1>React · useGlowTour</h1>
      <p className="tutorial-lead">Rendered under StrictMode.</p>
      <section className="tutorial-status" aria-label="Tour state">
        <output data-testid="tour-status">
          {core.status}
          {core.status === "active"
            ? ` · step ${core.currentStepIndex + 1} / ${core.totalSteps}`
            : ""}
        </output>
        <div className="tutorial-actions">
          <button type="button" onClick={startTutorial}>
            Start tutorial
          </button>
          <button type="button" disabled={!core.canCancel} onClick={() => void core.cancel()}>
            Cancel
          </button>
        </div>
      </section>
      <div className="tutorial-cards">
        <article className="tutorial-card" data-tour="profile">
          <h2>Profile</h2>
          <p>Name, avatar, and preferences.</p>
          <small>target: '[data-tour="profile"]'</small>
        </article>
        <article className="tutorial-card">
          <h2>Settings</h2>
          <button ref={saveButton} type="button">
            Save changes
          </button>
          <small>target: () =&gt; saveButton.current</small>
        </article>
        <article className="tutorial-card" data-tour="help">
          <h2>Help</h2>
          <p>Guides and support.</p>
          <small>target: '[data-tour="help"]'</small>
        </article>
      </div>
      <GlowTour.Root tour={core.tour}>
        <GlowTour.Overlay />
        <GlowTour.Pointer />
        <GlowTour.Popover>
          <GlowTour.Header />
          <StepCounter />
          <GlowTour.Content />
          <GlowTour.Footer>
            <GlowTour.CancelTrigger />
            <GlowTour.PreviousTrigger />
            <GlowTour.AdvanceTrigger />
          </GlowTour.Footer>
        </GlowTour.Popover>
      </GlowTour.Root>
    </main>
  );
}

function StepCounter() {
  const { status, currentStepIndex, totalSteps } = useGlowTourContext();

  return (
    <div className="tutorial-status">
      <output data-testid="tour-status">
        {status}
        {status === "active" ? ` · step ${currentStepIndex + 1} / ${totalSteps}` : ""}
      </output>
    </div>
  );
}

const app = document.getElementById("app");
if (!app) throw new Error("Missing #app");
createRoot(app).render(
  <StrictMode>
    <Tutorial />
  </StrictMode>,
);
