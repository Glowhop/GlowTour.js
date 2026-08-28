import "@glowhop/styles-tour/default.css";
import {
  createGlowTour,
  type GlowTourRootElement,
  type VanillaTourContent,
} from "@glowhop/vanilla-tour";
import { type LabContentFactory, mountLab } from "../lab";
import "../lab/lab.css";
import "../src/styles.css";

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
  <glow-tour-root>
    <glow-tour-overlay></glow-tour-overlay>
    <glow-tour-pointer>☝️</glow-tour-pointer>
    <glow-tour-popover>
      <glow-tour-header></glow-tour-header>
      <glow-tour-content></glow-tour-content>
      <glow-tour-footer>
        <glow-tour-back-trigger></glow-tour-back-trigger>
        <glow-tour-advance-trigger></glow-tour-advance-trigger>
        <glow-tour-cancel-trigger></glow-tour-cancel-trigger>
      </glow-tour-footer>
    </glow-tour-popover>
  </glow-tour-root>
`;

const tourRoot = lab.rendererRoot.querySelector<GlowTourRootElement>("glow-tour-root");
if (!tourRoot) throw new Error("Missing glow-tour-root");
tourRoot.tour = tour;

function element(tagName: string, text: string): HTMLElement {
  const node = document.createElement(tagName);
  node.textContent = text;
  return node;
}
