"use client";

import { createGlowTour, DefaultTour } from "@glowhop/react-tour";
import { useState } from "react";

export default function Page() {
  const [tour] = useState(() => createGlowTour());
  const [workflow] = useState(() =>
    tour
      .create("ssr-demo")
      .step({
        target: "#step-one-target",
        title: "Step One",
        content: "This step is rendered on the server and hydrated on the client.",
      })
      .step({
        target: "#step-two-target",
        title: "Step Two",
        content: "Advancing moved the tour to this second step.",
      })
      .build(),
  );

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Glow Tour SSR verification (Next.js / React)</h1>
      <p>
        This page exists to prove <code>@glowhop/react-tour</code> server-renders and hydrates
        correctly inside a real Next.js app.
      </p>
      <button
        id="start-tour-trigger"
        type="button"
        onClick={() => void tour.run(workflow)}
        style={{ padding: "10px 20px", fontSize: 16 }}
      >
        Start tour
      </button>
      <div style={{ display: "flex", gap: 24, marginTop: 40 }}>
        <div id="step-one-target" style={{ padding: 16, border: "1px solid #ccc" }}>
          Target one
        </div>
        <div id="step-two-target" style={{ padding: 16, border: "1px solid #ccc" }}>
          Target two
        </div>
      </div>
      <DefaultTour tour={tour} />
    </main>
  );
}
