import {
  createGlowTour,
  GlowTourBackTrigger,
  GlowTourCancelTrigger,
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourNextTrigger,
  GlowTourOverlay,
  GlowTourPointer,
  GlowTourPopover,
  GlowTourRoot,
  type VueTourContent,
} from "@glowhop/vue-tour";
import "@glowhop/styles-tour/default.css";
import { createApp, h } from "vue";
import { type LabContentFactory, mountLab } from "../lab";
import "../lab/lab.css";
import "../src/styles.css";

const root = document.querySelector<HTMLElement>("#vue-root");
if (!root) throw new Error("Missing #vue-root");

const tour = createGlowTour();
const content: LabContentFactory<VueTourContent> = {
  paragraph: (text) => h("p", text),
  title: (method) => h("span", ["API Builder ", h("code", method)]),
};
const lab = mountLab({ content, framework: "Vue", root, tour });

const app = createApp({
  render: () =>
    h(GlowTourRoot, { tour }, () => [
      h(GlowTourOverlay),
      h(GlowTourPointer, null, () => "☝️"),
      h(GlowTourPopover, null, () => [
        h(GlowTourHeader),
        h(GlowTourContent),
        h(GlowTourFooter, null, () => [
          h(GlowTourBackTrigger),
          h(GlowTourNextTrigger),
          h(GlowTourCancelTrigger),
        ]),
      ]),
    ]),
});
app.mount(lab.rendererRoot);
lab.addCleanup(() => app.unmount());
