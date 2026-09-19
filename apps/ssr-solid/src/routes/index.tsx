/** @jsxImportSource solid-js */

import { createGlowTour, GlowTourDefault } from "@glowhop/solid-tour";

export default function Home() {
  // Created inside the component, as the SSR guide recommends: one tour per request on the server.
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

  return (
    <main style={{ padding: "24px" }}>
      <h1 id="tour-target">GlowTour.js SSR (SolidStart) verification</h1>
      <button id="tour-trigger" type="button" onClick={() => void tour.start(workflow)}>
        Start tour
      </button>
      <GlowTourDefault tour={tour} />
    </main>
  );
}
