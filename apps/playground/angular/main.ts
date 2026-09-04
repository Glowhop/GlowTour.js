import "@angular/compiler";
import "zone.js";
import { Component } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import {
  type AngularTourContent,
  createGlowTour,
  GlowTourAdvanceTrigger,
  GlowTourBackTrigger,
  GlowTourCancelTrigger,
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourOverlay,
  GlowTourPointer,
  GlowTourPopover,
  GlowTourRoot,
} from "@glowhop/angular-tour";
import "@glowhop/styles-tour/default.css";
import { type LabContentFactory, mountLab } from "../lab";
import "../lab/lab.css";
import "../src/styles.css";

const root = document.querySelector<HTMLElement>("angular-playground");
if (!root) throw new Error("Missing angular-playground");

const tour = createGlowTour();
const content: LabContentFactory<AngularTourContent> = {
  paragraph: (text) => text,
  title: (method) => `API Builder ${method}`,
};
const lab = mountLab({ content, framework: "Angular", root, tour });
lab.rendererRoot.append(document.createElement("angular-tour-renderer"));

@Component({
  selector: "angular-tour-renderer",
  standalone: true,
  imports: [
    GlowTourRoot,
    GlowTourOverlay,
    GlowTourPointer,
    GlowTourPopover,
    GlowTourHeader,
    GlowTourContent,
    GlowTourFooter,
    GlowTourBackTrigger,
    GlowTourAdvanceTrigger,
    GlowTourCancelTrigger,
  ],
  template: `
    <glow-tour-root [tour]="tour">
      <glow-tour-overlay></glow-tour-overlay>
      <glow-tour-pointer></glow-tour-pointer>
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
  `,
})
class AngularTourRenderer {
  readonly tour = tour;
}

bootstrapApplication(AngularTourRenderer)
  .then((application) => lab.addCleanup(() => application.destroy()))
  .catch((error: unknown) => {
    const fallback = document.createElement("pre");
    fallback.className = "lab-panel";
    fallback.textContent = error instanceof Error ? error.message : String(error);
    lab.rendererRoot.appendChild(fallback);
    console.error(error);
  });
