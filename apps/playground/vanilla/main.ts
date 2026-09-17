import "@glowhop/styles-tour/default.css";
import {
  createGlowTour,
  type GlowTourRootElement,
  registerGlowTourElements,
  type VanillaTourContent,
} from "@glowhop/vanilla-tour";
import { type LabContentFactory, mountLab } from "../lab";
import "../lab/lab.css";
import "../src/styles.css";
import "../src/theme";

// The main entry is side-effect free: the <glow-tour-*> markup below needs its elements defined.
registerGlowTourElements();

const root = document.querySelector<HTMLElement>("#vanilla-root");
if (!root) throw new Error("Missing #vanilla-root");

const tour = createGlowTour();
const content: LabContentFactory<VanillaTourContent> = {
  paragraph: (text) => element("p", text),
  title: (method) => {
    const title = element("span", "API Builder ");
    title.append(element("code", method));
    return title;
  },
};
const lab = mountLab({ content, framework: "Vanilla", root, tour });
lab.rendererRoot.innerHTML = `
  <glow-tour-default></glow-tour-default>
`;

const tourRoot = lab.rendererRoot.querySelector<GlowTourRootElement>("glow-tour-default");
if (!tourRoot) throw new Error("Missing glow-tour-default");
tourRoot.tour = tour;

function element(tagName: string, text: string): HTMLElement {
  const node = document.createElement(tagName);
  node.textContent = text;
  return node;
}
