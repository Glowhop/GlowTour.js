/** @jsxImportSource solid-js */

import { createGlowTour, DefaultTour } from "@glowhop/solid-tour";

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({
    id: "tour-target",
    target: "#tour-target",
    title: "Welcome",
    content: "This is the first step.",
  })
  .step({
    id: "tour-trigger",
    target: "#tour-trigger",
    title: "Trigger",
    content: "This is the second step.",
  })
  .build();

export default function Home() {
  return (
    <main style={{ padding: "24px" }}>
      <h1 id="tour-target">GlowTour.js SSR (SolidStart) verification</h1>
      <button id="tour-trigger" type="button" onClick={() => void tour.run(workflow)}>
        Start tour
      </button>
      <DefaultTour tour={tour} />
    </main>
  );
}
