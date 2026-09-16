import {
  createGlowTour,
  GlowTourAdvanceTrigger,
  GlowTourCancelTrigger,
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourOverlay,
  GlowTourPointer,
  GlowTourPopover,
  GlowTourPreviousTrigger,
  GlowTourRoot,
} from "@glowhop/react-tour";
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
  <GlowTourRoot tour={tour}>
    <GlowTourOverlay />
    <GlowTourPointer />
    <GlowTourPopover>
      <GlowTourHeader />
      <GlowTourContent />
      <GlowTourFooter className="border border-amber-200">
        <GlowTourCancelTrigger />
        <GlowTourPreviousTrigger />
        <GlowTourAdvanceTrigger />
      </GlowTourFooter>
    </GlowTourPopover>
  </GlowTourRoot>,
);
lab.addCleanup(() => reactRoot.unmount());
