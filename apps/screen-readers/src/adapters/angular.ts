import "@angular/compiler";
import "zone.js";
import { Component } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { createGlowTour, GlowTourDefault } from "@glowhop/angular-tour";
import { buildWorkflow, type MountFixture } from "../fixture";

const tour = createGlowTour();

@Component({
  selector: "screen-reader-tour",
  standalone: true,
  imports: [GlowTourDefault],
  template: `<glow-tour-default [tour]="tour" />`,
})
class ScreenReaderTour {
  readonly tour = tour;
}

export const mount: MountFixture = async (host) => {
  const workflow = buildWorkflow(tour, (value) => value);
  host.append(document.createElement("screen-reader-tour"));
  await bootstrapApplication(ScreenReaderTour);
  return () => tour.run(workflow);
};
