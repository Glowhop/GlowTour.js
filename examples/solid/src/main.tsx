import { render } from "solid-js/web";
import "@glowhop/styles-tour/default.css";
import { createGlowTour, DefaultTour } from "@glowhop/solid-tour";

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({ target: "#welcome", title: "Welcome", content: "Hello world!" })
  .build();

const appRoot = document.getElementById("root");
if (appRoot) {
  render(
    () => (
      <>
        <div style={{ padding: "20px" }}>
          <h1>Glow Tour - Solid Example</h1>
          <button
            id="welcome"
            type="button"
            onClick={() => void tour.run(workflow)}
            style={{ padding: "10px 20px", "font-size": "16px" }}
          >
            Start tour
          </button>
        </div>
        <DefaultTour tour={tour} />
      </>
    ),
    appRoot,
  );
}
