/** @jsxImportSource solid-js */

import { GlowTour, glowTour } from "@glowhop/solid-tour";
import "@glowhop/styles-tour/default.css";
import { render } from "solid-js/web";
import "../src/styles.css";

const tour = glowTour
  .create("solid-playground", {
    overlay: { color: "#101820", opacity: 0.58, padding: 10, radius: 8 },
  })
  .step({
    target: "#solid-tour-id-1",
    title: <strong>SolidJS native node</strong>,
    content: "This step targets a real Solid-rendered element.",
  })
  .step({
    target: "#solid-tour-id-2",
    title: "SolidJS overlay override",
    content: "This step uses a red overlay.",
    overlay: { color: "red" },
  })
  .step({
    target: "#solid-tour-id-3",
    title: "SolidJS interactive target",
    content: "The target remains interactive and receives the pointer.",
    behavior: { allowInteraction: true },
  })
  .finish();

function SolidPlayground() {
  return (
    <main class="app-screen bg-lime-50/40">
      <a class="back-link inline-flex items-center gap-2 text-emerald-700" href="/">
        Playground
      </a>
      <section class="app-panel shadow-sm ring-1 ring-black/5">
        <h1 class="text-3xl font-semibold tracking-tight">SolidJS app</h1>
        <button class="w-fit" type="button" onClick={() => void glowTour.run(tour)}>
          Start tour
        </button>
        <span id="solid-tour-id-1" class="target-pill">
          Step 1
        </span>
        <span id="solid-tour-id-2" class="target-pill">
          Step 2
        </span>
        <button id="solid-tour-id-3" class="target-button target-shrink" type="button">
          Step 3
        </button>

        <GlowTour.Root>
          <GlowTour.Overlay />
          <GlowTour.Pointer>☝️</GlowTour.Pointer>
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

const root = document.querySelector<HTMLElement>("#solid-root");
if (!root) {
  throw new Error("Missing #solid-root");
}

render(() => <SolidPlayground />, root);
