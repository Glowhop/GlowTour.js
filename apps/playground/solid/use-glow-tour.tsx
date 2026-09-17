/** @jsxImportSource solid-js */

import { GlowTourDefault, useGlowTour } from "@glowhop/solid-tour";
import "@glowhop/styles-tour/default.css";
import { render } from "solid-js/web";
import "../src/styles.css";
import "../src/tutorial.css";

function Tutorial() {
  let saveButton: HTMLButtonElement | undefined;
  const { tour, create, start, cancel, status, canCancel, currentStepIndex, totalSteps } =
    useGlowTour();

  const workflow = create("solid-use-glow-tour")
    .step({
      id: "profile",
      target: '[data-tour="profile"]',
      title: "Your profile",
      content: "This step targets a data-tour attribute.",
    })
    .step({
      id: "save",
      target: () => saveButton ?? null,
      title: "Save",
      content: "This step targets a Solid ref through a function.",
    })
    .step({
      id: "help",
      target: '[data-tour="help"]',
      title: "Help",
      content: "The status bar above updates from useGlowTour, outside the tour root.",
    })
    .build();

  return (
    <main class="tutorial">
      <h1>SolidJS · useGlowTour</h1>
      <p class="tutorial-lead">State fields are accessors.</p>
      <section class="tutorial-status" aria-label="Tour state">
        <output data-testid="tour-status">
          {status()}
          {status() === "active" ? ` · step ${currentStepIndex() + 1} / ${totalSteps()}` : ""}
        </output>
        <div class="tutorial-actions">
          <button type="button" onClick={() => void start(workflow)}>
            Start tutorial
          </button>
          <button type="button" disabled={!canCancel()} onClick={() => void cancel()}>
            Cancel
          </button>
        </div>
      </section>
      <div class="tutorial-cards">
        <article class="tutorial-card" data-tour="profile">
          <h2>Profile</h2>
          <p>Name, avatar, and preferences.</p>
          <small>target: '[data-tour="profile"]'</small>
        </article>
        <article class="tutorial-card">
          <h2>Settings</h2>
          <button ref={saveButton} type="button">
            Save changes
          </button>
          <small>target: () =&gt; saveButton</small>
        </article>
        <article class="tutorial-card" data-tour="help">
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
render(() => <Tutorial />, app);
