/** @jsxImportSource solid-js */

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
  type SolidTourContent,
} from "@glowhop/solid-tour";
import "@glowhop/styles-tour/default.css";
import { render } from "solid-js/web";
import { type LabContentFactory, mountLab } from "../lab";
import "../lab/lab.css";
import "../src/styles.css";

const root = document.querySelector<HTMLElement>("#solid-root");
if (!root) throw new Error("Missing #solid-root");

const tour = createGlowTour();
const content: LabContentFactory<SolidTourContent> = {
  paragraph: (text) => <p>{text}</p>,
  title: (method) => (
    <span>
      API Builder <code>{method}</code>
    </span>
  ),
};
const lab = mountLab({ content, framework: "SolidJS", root, tour });

const disposeRenderer = render(
  () => (
    <GlowTourRoot tour={tour}>
      <GlowTourOverlay />
      <GlowTourPointer />
      <GlowTourPopover>
        <GlowTourHeader />
        <GlowTourContent />
        <GlowTourFooter>
          <GlowTourPreviousTrigger />
          <GlowTourAdvanceTrigger />
          <GlowTourCancelTrigger />
        </GlowTourFooter>
      </GlowTourPopover>
    </GlowTourRoot>
  ),
  lab.rendererRoot,
);
lab.addCleanup(disposeRenderer);
