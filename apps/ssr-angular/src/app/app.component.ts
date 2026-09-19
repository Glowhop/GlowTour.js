import { Component } from "@angular/core";
import { createGlowTour, GlowTourDefault } from "@glowhop/angular-tour";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [GlowTourDefault],
  template: `
    <div style="padding: 20px">
      <h1>GlowTour.js - SSR Angular verification harness</h1>
      <p id="tour-target">This is the tour target element.</p>
      <button id="tour-trigger" type="button" (click)="start()">Start tour</button>
    </div>
    <glow-tour-default [tour]="tour" />
  `,
})
export class AppComponent {
  readonly tour = createGlowTour();
  readonly workflow = this.tour
    .create("welcome")
    .step({
      id: "tour-target",
      content: "This step is rendered by the SSR verification harness.",
      target: "#tour-target",
      title: "Step one",
    })
    .step({
      id: "tour-trigger",
      content: "Clicking advance again finishes the tour.",
      target: "#tour-trigger",
      title: "Step two",
    })
    .build();

  start(): void {
    void this.tour.start(this.workflow);
  }
}
