import { GlowTour, glowTour } from "@glowhop/react-tour";
import "@glowhop/styles-tour/default.css";
import { createRoot } from "react-dom/client";
import "../src/styles.css";

const tour = glowTour
  .create("react-playground", {
    overlay: { color: "#101820", opacity: 0.58, padding: 10, radius: 8 },
    popover: {
      buttons: {
        cancelLabel: "Exit tour",
        finishLabel: "Finish tour",
        nextLabel: "Next step",
        backLabel: "Previous step",
      },
    },
  })
  .step({
    target: "#react-tour-id-1",
    title: <strong>React native node</strong>,
    content: "This step targets a real React-rendered element.",
  })
  .step({
    target: "#react-tour-id-2",
    title: "React step",
    content: "This step targets a real React-rendered element.",
    overlay: {
      color: "red",
    },
  })
  .step({
    target: "#react-tour-id-3",
    title: "React step",
    content: "This step targets a real React-rendered element.",
    behavior: {
      allowInteraction: true,
    },
  })
  .finish();

function ReactPlayground() {
  return (
    <main className="app-screen bg-lime-50/40">
      <a className="back-link inline-flex items-center gap-2 text-emerald-700" href="/">
        Playground
      </a>
      <section className="app-panel shadow-sm ring-1 ring-black/5">
        <h1 className="text-3xl font-semibold tracking-tight">React app</h1>
        <button type="button" className="w-fit" onClick={() => glowTour.run(tour)}>
          Start tour
        </button>
        <span id="react-tour-id-1" className="target-pill">
          Step 1
        </span>
        <span id="react-tour-id-2" className="target-pill">
          Step 2
        </span>
        <button type="button" id="react-tour-id-3" className="target-button target-shrink">
          Step 3
        </button>

        <GlowTour.Root>
          <GlowTour.Overlay />
          <GlowTour.Pointer>
            <span data-glow-tour-pointer-content>☝️</span>
          </GlowTour.Pointer>
          <GlowTour.Popover>
            <GlowTour.Header />
            <GlowTour.Content />
            <GlowTour.Footer>
              <GlowTour.BackTrigger />
              <GlowTour.NextTrigger />
            </GlowTour.Footer>
          </GlowTour.Popover>
        </GlowTour.Root>
      </section>
    </main>
  );
}

const root = document.querySelector("#react-root");
if (!root) {
  throw new Error("Missing #react-root");
}

createRoot(root).render(<ReactPlayground />);
