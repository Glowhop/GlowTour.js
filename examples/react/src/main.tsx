import { createRoot } from "react-dom/client";
import "@glowhop/styles-tour/default.css";
import { createGlowTour, GlowTourDefault } from "@glowhop/react-tour";

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({ id: "welcome", target: "#welcome", title: "Welcome", content: "Hello world!" })
  .build();

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <>
      <div style={{ padding: "20px" }}>
        <h1>GlowTour.js - React Example</h1>
        <button
          id="welcome"
          type="button"
          onClick={() => void tour.run(workflow)}
          style={{ padding: "10px 20px", fontSize: "16px" }}
        >
          Start tour
        </button>
      </div>
      <GlowTourDefault tour={tour} />
    </>,
  );
}
