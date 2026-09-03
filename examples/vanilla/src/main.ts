import "@glowhop/styles-tour/default.css";
import {
  createDefaultTourElement,
  createGlowTour,
  registerGlowTourElements,
} from "@glowhop/vanilla-tour";

registerGlowTourElements();

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({ target: "#welcome", title: "Welcome", content: "Hello world!" })
  .build();

// Create a container
const container = document.createElement("div");
container.style.padding = "20px";

// Create a heading
const heading = document.createElement("h1");
heading.textContent = "Glow Tour - Vanilla Example";
container.append(heading);

// Create the button to target
const button = document.createElement("button");
button.id = "welcome";
button.type = "button";
button.textContent = "Start tour";
button.style.padding = "10px 20px";
button.style.fontSize = "16px";
button.addEventListener("click", () => void tour.run(workflow));
container.append(button);

document.body.append(container);

// Create and append the tour component
const root = createDefaultTourElement(tour);
document.body.append(root);
