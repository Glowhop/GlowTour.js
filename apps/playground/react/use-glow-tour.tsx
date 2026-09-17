import { GlowTourDefault, useGlowTour } from "@glowhop/react-tour";
import "@glowhop/styles-tour/default.css";
import { StrictMode, useRef } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles.css";
import "../src/tutorial.css";

function Tutorial() {
  const saveButton = useRef<HTMLButtonElement>(null);
  const { tour, create, start, cancel, status, canCancel, currentStepIndex, totalSteps } =
    useGlowTour();

  function startTutorial() {
    const workflow = create("react-use-glow-tour")
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
    void start(workflow);
  }

  return (
    <main className="tutorial">
      <h1>React · useGlowTour</h1>
      <p className="tutorial-lead">Rendered under StrictMode.</p>
      <section className="tutorial-status" aria-label="Tour state">
        <output data-testid="tour-status">
          {status}
          {status === "active" ? ` · step ${currentStepIndex + 1} / ${totalSteps}` : ""}
        </output>
        <div className="tutorial-actions">
          <button type="button" onClick={startTutorial}>
            Start tutorial
          </button>
          <button type="button" disabled={!canCancel} onClick={() => void cancel()}>
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
      <GlowTourDefault tour={tour} />
    </main>
  );
}

const app = document.getElementById("app");
if (!app) throw new Error("Missing #app");
createRoot(app).render(
  <StrictMode>
    <Tutorial />
  </StrictMode>,
);
