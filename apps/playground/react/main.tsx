import { createGlowTour, GlowTour } from "@glowhop/react-tour";
import "@glowhop/styles-tour/default.css";
import { createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { type LabContentFactory, mountLab } from "../lab";
import "../lab/lab.css";
import "../src/styles.css";

const root = document.querySelector<HTMLElement>("#react-root");
if (!root) throw new Error("Missing #react-root");

const tour = createGlowTour();
const content: LabContentFactory<ReactNode> = {
  paragraph: (text) => createElement("p", null, text),
  title: (method) =>
    createElement("span", null, "API Builder ", createElement("code", null, method)),
};
const lab = mountLab({ content, framework: "React", root, tour });

const reactRoot = createRoot(lab.rendererRoot);
reactRoot.render(
  <GlowTour.Root tour={tour}>
    <GlowTour.Overlay />
    <GlowTour.Pointer>☝️</GlowTour.Pointer>
    <GlowTour.Popover>
      <GlowTour.Header />
      <GlowTour.Content />
      <GlowTour.Footer>
        <GlowTour.BackTrigger />
        <GlowTour.AdvanceTrigger />
        <GlowTour.CancelTrigger />
      </GlowTour.Footer>
    </GlowTour.Popover>
  </GlowTour.Root>,
);
lab.addCleanup(() => reactRoot.unmount());
