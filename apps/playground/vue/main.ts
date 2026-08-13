import {
  GlowTourBackTrigger,
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourNextTrigger,
  GlowTourOverlay,
  GlowTourPointer,
  GlowTourPopover,
  GlowTourRoot,
  glowTour,
} from "@glowhop/vue-tour";
import "@glowhop/styles-tour/default.css";
import { createApp, h } from "vue";
import "../src/styles.css";

const tour = glowTour
  .create("vue-playground", {
    overlay: { color: "#101820", opacity: 0.58, padding: 10, radius: 8 },
  })
  .step({
    target: "#vue-tour-id-1",
    title: h("strong", "Vue native VNode"),
    content: "This step targets a real Vue-rendered element.",
  })
  .step({
    target: "#vue-tour-id-2",
    title: "Vue overlay override",
    content: "This step uses a red overlay.",
    overlay: { color: "red" },
  })
  .step({
    target: "#vue-tour-id-3",
    title: "Vue interactive target",
    content: "The target remains interactive and receives the pointer.",
    behavior: { allowInteraction: true },
  })
  .finish();

createApp({
  setup() {
    const startTour = () => {
      void glowTour.run(tour);
    };

    return () =>
      h("main", { class: "app-screen bg-lime-50/40" }, [
        h(
          "a",
          { class: "back-link inline-flex items-center gap-2 text-emerald-700", href: "/" },
          "Playground",
        ),
        h("section", { class: "app-panel shadow-sm ring-1 ring-black/5" }, [
          h("h1", { class: "text-3xl font-semibold tracking-tight" }, "Vue app"),
          h("button", { class: "w-fit", type: "button", onClick: startTour }, "Start tour"),
          h("span", { id: "vue-tour-id-1", class: "target-pill" }, "Step 1"),
          h("span", { id: "vue-tour-id-2", class: "target-pill" }, "Step 2"),
          h(
            "button",
            { id: "vue-tour-id-3", class: "target-button target-shrink", type: "button" },
            "Step 3",
          ),
          h(GlowTourRoot, null, () => [
            h(GlowTourOverlay),
            h(GlowTourPointer, null, () => "☝️"),
            h(GlowTourPopover, null, () => [
              h(GlowTourHeader),
              h(GlowTourContent),
              h(GlowTourFooter, null, () => [
                h(GlowTourBackTrigger, { backLabel: "Previous step" }),
                h(GlowTourNextTrigger, { finishLabel: "Finish tour", nextLabel: "Next step" }),
              ]),
            ]),
          ]),
        ]),
      ]);
  },
}).mount("#vue-root");
