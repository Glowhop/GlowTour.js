import "@glowhop/styles-tour/default.css";
import { createGlowTour, type GlowTourRootElement } from "@glowhop/vanilla-tour";
import "../src/styles.css";

const nativeTitle = document.createElement("strong");
nativeTitle.textContent = "Vanilla native Node";

const tour = createGlowTour();
const workflow = tour
  .create("vanilla-playground", {
    overlay: { color: "#101820", opacity: 0.58, padding: 10, radius: 8 },
  })
  .step({
    target: "#vanilla-tour-id-1",
    title: nativeTitle,
    content: "This step targets a vanilla DOM element.",
  })
  .step({
    target: "#vanilla-tour-id-2",
    title: "Vanilla overlay override",
    content: "This step uses a red overlay.",
    overlay: { color: "red" },
  })
  .step({
    target: "#vanilla-tour-id-3",
    title: "Vanilla interactive target",
    content: "The target remains interactive and receives the pointer.",
    behavior: { allowInteraction: true },
  })
  .build();

document.querySelector("[data-start-tour]")?.addEventListener("click", () => {
  void tour.run(workflow);
});

const tourRoot = document.querySelector<GlowTourRootElement>("glow-tour-root");
if (tourRoot) tourRoot.tour = tour;
